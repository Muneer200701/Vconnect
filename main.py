from pathlib import Path
import sqlite3
import hashlib, secrets
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from recommendations import rank_workers, vtrust_score

DB = Path(__file__).parent / "vconnect.db"

app = FastAPI(title="VConnect API", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

app.mount("/static", StaticFiles(directory="."), name="static")

@app.get("/")
def read_root():
    return FileResponse("index.html")

class WorkerAvailabilityUpdate(BaseModel):
    available: int

class BookingCreate(BaseModel):
    worker_id: int
    service: str = Field(min_length=2)
    address: str = Field(min_length=5)
    preferred_date: str
    preferred_time: str
    description: str = ""
    customer_name: str = "Demo Customer"
    priority: str = "Standard"
    emergency_type: Optional[str] = None

class BookingStatus(BaseModel):
    status: str

class SuggestionRequest(BaseModel):
    description: str = Field(min_length=3)

class WorkerCreate(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    category: str = Field(min_length=2)
    skills: str = Field(min_length=3, max_length=250)
    experience: str = Field(min_length=1, max_length=50)
    price: int = Field(ge=100, le=10000)
    bio: str = Field(min_length=10, max_length=500)
    phone: str = Field(min_length=8, max_length=20)

class GroupBookingCreate(BaseModel):
    service: str
    date: str
    location: str = Field(min_length=5)
    description: str = ""
    customer_name: str = "Demo Customer"

class CommunityHelpCreate(BaseModel):
    title: str = Field(min_length=3)
    help_type: str
    location: str = Field(min_length=3)
    description: str = Field(min_length=3)
    requester_name: str = "Demo Customer"

class AuthRequest(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    email: str
    password: str = Field(min_length=6)
    role: str
    category: Optional[str] = "General"
    skills: Optional[str] = "General Services"
    experience: Optional[str] = "1 year"
    price: Optional[int] = 300
    bio: Optional[str] = "Cooperative member ready to work."

class LoginRequest(BaseModel):
    email: str
    password: str

def connection():
    con = sqlite3.connect(DB)
    con.row_factory = sqlite3.Row
    return con

def rows(query, args=()):
    with connection() as con: return [dict(r) for r in con.execute(query, args).fetchall()]

def initialize():
    with connection() as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS services(id INTEGER PRIMARY KEY, name TEXT UNIQUE, icon TEXT, description TEXT);
        CREATE TABLE IF NOT EXISTS workers(id INTEGER PRIMARY KEY, name TEXT, category TEXT, skills TEXT, rating REAL, reviews INTEGER, experience TEXT, price INTEGER, available INTEGER, distance REAL, avatar TEXT, bio TEXT, lat REAL, lng REAL, cooperative_member INTEGER DEFAULT 1);
        CREATE TABLE IF NOT EXISTS bookings(id INTEGER PRIMARY KEY AUTOINCREMENT, worker_id INTEGER, customer_name TEXT, service TEXT, address TEXT, preferred_date TEXT, preferred_time TEXT, description TEXT, status TEXT DEFAULT 'Pending', created_at TEXT);
        CREATE TABLE IF NOT EXISTS reviews(id INTEGER PRIMARY KEY, worker_id INTEGER, customer TEXT, rating REAL, text TEXT);
        CREATE TABLE IF NOT EXISTS memberships(id INTEGER PRIMARY KEY, worker_id INTEGER, joined_at TEXT, contribution_percent REAL);
        CREATE TABLE IF NOT EXISTS group_bookings(id INTEGER PRIMARY KEY AUTOINCREMENT, service TEXT, date TEXT, location TEXT, description TEXT, creator_name TEXT, status TEXT DEFAULT 'Open', created_at TEXT);
        CREATE TABLE IF NOT EXISTS group_booking_members(id INTEGER PRIMARY KEY AUTOINCREMENT, group_id INTEGER, member_name TEXT, UNIQUE(group_id, member_name));
        CREATE TABLE IF NOT EXISTS community_help(id INTEGER PRIMARY KEY AUTOINCREMENT, title TEXT, help_type TEXT, location TEXT, description TEXT, requester_name TEXT, status TEXT DEFAULT 'Open', created_at TEXT);
        CREATE TABLE IF NOT EXISTS help_volunteers(id INTEGER PRIMARY KEY AUTOINCREMENT, help_id INTEGER, volunteer_name TEXT, UNIQUE(help_id, volunteer_name));
        CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE, password_hash TEXT, role TEXT CHECK(role IN ('customer','worker')), worker_id INTEGER, created_at TEXT);
        CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER, created_at TEXT);
        ''')
        columns={r[1] for r in con.execute('PRAGMA table_info(bookings)')}
        if 'priority' not in columns: con.execute("ALTER TABLE bookings ADD COLUMN priority TEXT DEFAULT 'Standard'")
        if 'emergency_type' not in columns: con.execute('ALTER TABLE bookings ADD COLUMN emergency_type TEXT')
        worker_columns={r[1] for r in con.execute('PRAGMA table_info(workers)')}
        if 'on_time_rate' not in worker_columns: con.execute('ALTER TABLE workers ADD COLUMN on_time_rate REAL DEFAULT .95')
        if 'complaints' not in worker_columns: con.execute('ALTER TABLE workers ADD COLUMN complaints INTEGER DEFAULT 0')
        if 'customer_id' not in columns: con.execute('ALTER TABLE bookings ADD COLUMN customer_id INTEGER')
        if con.execute("SELECT count(*) FROM services").fetchone()[0]: return
        services=[('Plumbing','💧','Leaks, fittings and water systems'),('Electrical','⚡','Safe repairs and installations'),('Cleaning','✦','Home and deep cleaning'),('Carpentry','▦','Furniture and woodwork'),('Appliance Repair','◉','Care for essential appliances'),('Painting','◒','Fresh, thoughtful finishes'),('Home Tutoring','✎','Learning support nearby'),('Community Services','◎','Everyday local help')]
        con.executemany("INSERT INTO services(name,icon,description) VALUES(?,?,?)",services)

@app.on_event('startup')
def startup(): initialize()

@app.get('/services')
def get_services(): return rows('SELECT * FROM services')

@app.get('/workers')
def get_workers(category: Optional[str]=None, available: Optional[bool]=None, search: Optional[str]=None):
    query, args = 'SELECT * FROM workers WHERE 1=1', []
    if category and category != 'All': query += ' AND category=?'; args.append(category)
    if available is not None: query += ' AND available=?'; args.append(int(available))
    if search: query += ' AND (name LIKE ? OR skills LIKE ? OR category LIKE ?)'; args += [f'%{search}%']*3
    return enrich_workers(rows(query+' ORDER BY rating DESC', args))

def enrich_workers(workers):
    for worker in workers:
        stats=rows("SELECT SUM(CASE WHEN status='Completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN status='Cancelled' THEN 1 ELSE 0 END) AS cancelled, COUNT(*) AS total FROM bookings WHERE worker_id=?",(worker['id'],))[0]
        worker['completed_jobs']=stats['completed'] or 0
        worker['cancellation_rate']=round((stats['cancelled'] or 0)/stats['total'],2) if stats['total'] else 0
        worker['vtrust_score']=vtrust_score(worker)
    return workers

def password_hash(password): return hashlib.pbkdf2_hmac('sha256', password.encode(), b'vconnect-demo-salt', 100_000).hex()

def get_or_create_worker_for_user(con, user_id: int, user_name: str) -> int:
    row = con.execute('SELECT worker_id FROM users WHERE id=?', (user_id,)).fetchone()
    if row and row[0]:
        w = con.execute('SELECT id FROM workers WHERE id=?', (row[0],)).fetchone()
        if w: return w[0]
    
    found_w = con.execute('SELECT id FROM workers WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))', (user_name,)).fetchone()
    if found_w:
        worker_id = found_w[0]
    else:
        initials = ''.join(part[0].upper() for part in user_name.strip().split()[:2]) or 'VC'
        cur = con.execute('''INSERT INTO workers(name, category, skills, rating, reviews, experience, price, available, distance, avatar, bio, lat, lng, cooperative_member)
        VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (user_name.strip(), 'Local Professional', 'Reliable Local Services · Cooperative Member', 5.0, 0, '1 year', 400, 1, 2.0, initials, f'Verified cooperative member {user_name.strip()}.', 28.6200, 77.2100, 1))
        worker_id = cur.lastrowid
        con.execute('INSERT INTO memberships(worker_id, joined_at, contribution_percent) VALUES(?, ?, ?)', (worker_id, datetime.now().date().isoformat(), 8))
    
    con.execute('UPDATE users SET worker_id=? WHERE id=?', (worker_id, user_id))
    return worker_id

def current_user(token: Optional[str]):
    if not token: raise HTTPException(401,'Please log in first')
    with connection() as con:
        found = con.execute('SELECT users.id,users.name,users.email,users.role,users.worker_id FROM sessions JOIN users ON users.id=sessions.user_id WHERE sessions.token=?',(token,)).fetchone()
        if not found: raise HTTPException(401,'Your session has expired')
        user = dict(found)
        if user['role'] == 'worker' and not user['worker_id']:
            user['worker_id'] = get_or_create_worker_for_user(con, user['id'], user['name'])
        return user

@app.post('/auth/signup', status_code=201)
def signup(data: AuthRequest):
    if data.role not in {'customer','worker'}: raise HTTPException(422,'Select Customer or Worker')
    with connection() as con:
        try:
            cur=con.execute('INSERT INTO users(name,email,password_hash,role,created_at) VALUES(?,?,?,?,?)',(data.name.strip(),data.email.lower().strip(),password_hash(data.password),data.role,datetime.now().isoformat()))
        except sqlite3.IntegrityError: raise HTTPException(409,'An account with this email already exists')
        user_id=cur.lastrowid
        
        # If they are a worker, save all their specific profile details!
        if data.role == 'worker':
            initials = ''.join(part[0].upper() for part in data.name.strip().split()[:2]) or 'VC'
            cur_worker = con.execute('''INSERT INTO workers(name, category, skills, rating, reviews, experience, price, available, distance, avatar, bio, lat, lng, cooperative_member)
            VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (data.name.strip(), data.category, data.skills, 5.0, 0, data.experience, data.price, 1, 2.0, initials, data.bio, 28.6200, 77.2100, 1))
            worker_id = cur_worker.lastrowid
            con.execute('INSERT INTO memberships(worker_id, joined_at, contribution_percent) VALUES(?, ?, ?)', (worker_id, datetime.now().date().isoformat(), 8))
            con.execute('UPDATE users SET worker_id=? WHERE id=?', (worker_id, user_id))
            
        token=secrets.token_urlsafe(24)
        con.execute('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)',(token,user_id,datetime.now().isoformat()))
    return {'token':token,'user':current_user(token)}

@app.post('/auth/login')
def login(data: LoginRequest):
    found=rows('SELECT id, name, role, worker_id FROM users WHERE email=? AND password_hash=?',(data.email.lower().strip(),password_hash(data.password)))
    if not found: raise HTTPException(401,'Incorrect email or password')
    user = found[0]
    token=secrets.token_urlsafe(24)
    with connection() as con:
        if user['role'] == 'worker' and not user['worker_id']:
            get_or_create_worker_for_user(con, user['id'], user['name'])
        con.execute('INSERT INTO sessions(token,user_id,created_at) VALUES(?,?,?)',(token,user['id'],datetime.now().isoformat()))
    return {'token':token,'user':current_user(token)}

@app.get('/auth/me')
def me(token: Optional[str]=None, token_header: Optional[str]=Header(None, alias="token")):
    auth_token = token or token_header
    return current_user(auth_token)

@app.post('/auth/logout')
def logout(token: Optional[str]=None, token_header: Optional[str]=Header(None, alias="token")):
    auth_token = token or token_header
    with connection() as con: con.execute('DELETE FROM sessions WHERE token=?',(auth_token,))
    return {'message':'Logged out'}

@app.get('/workers/recommended')
def recommended(service: Optional[str]=None, emergency: bool=False):
    workers=enrich_workers(rows('SELECT * FROM workers'))
    if emergency: workers=[w for w in workers if w['available']]
    return rank_workers(workers, service)[:3]

@app.get('/workers/{worker_id}')
def get_worker(worker_id:int):
    found=rows('SELECT * FROM workers WHERE id=?',(worker_id,))
    if not found: raise HTTPException(404,'Worker not found')
    worker=enrich_workers(found)[0]; worker['reviews_list']=rows('SELECT * FROM reviews WHERE worker_id=?',(worker_id,)); return worker

@app.put('/workers/{worker_id}/availability')
def set_worker_availability(worker_id: int, data: WorkerAvailabilityUpdate):
    with connection() as con:
        if not con.execute('SELECT id FROM workers WHERE id=?', (worker_id,)).fetchone():
            raise HTTPException(404, 'Worker not found')
        con.execute('UPDATE workers SET available=? WHERE id=?', (data.available, worker_id))
    return {'id': worker_id, 'available': data.available}

@app.post('/workers', status_code=201)
def create_worker(data: WorkerCreate, token: Optional[str]=None, token_header: Optional[str]=Header(None, alias="token")):
    auth_token = token or token_header
    initials=''.join(part[0].upper() for part in data.name.split()[:2]) or 'VC'
    with connection() as con:
        cur=con.execute('''INSERT INTO workers(name,category,skills,rating,reviews,experience,price,available,distance,avatar,bio,lat,lng,cooperative_member)
        VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',(data.name,data.category,data.skills,5.0,0,data.experience,data.price,1,3.0,initials,data.bio,28.6200,77.2100,1))
        worker_id=cur.lastrowid
        con.execute('INSERT INTO memberships(worker_id,joined_at,contribution_percent) VALUES(?,?,?)',(worker_id,datetime.now().date().isoformat(),8))
        if auth_token:
            session_row = con.execute('SELECT user_id FROM sessions WHERE token=?', (auth_token,)).fetchone()
            if session_row:
                con.execute('UPDATE users SET worker_id=? WHERE id=?', (worker_id, session_row[0]))
    return {'id':worker_id,'message':'Welcome to VConnect! Your worker profile and cooperative membership are active.'}

@app.post('/bookings', status_code=201)
def create_booking(data: BookingCreate):
    if not rows('SELECT id FROM workers WHERE id=?',(data.worker_id,)): raise HTTPException(404,'Worker not found')
    with connection() as con:
        priority='High' if data.priority == 'High' else 'Standard'
        cur=con.execute('INSERT INTO bookings(worker_id,customer_name,service,address,preferred_date,preferred_time,description,status,created_at,priority,emergency_type) VALUES(?,?,?,?,?,?,?,?,?,?,?)',(data.worker_id,data.customer_name,data.service,data.address,data.preferred_date,data.preferred_time,data.description,'Pending',datetime.now().isoformat(),priority,data.emergency_type))
        return {'id':cur.lastrowid,'message':'High-priority emergency request sent.' if priority=='High' else 'Booking request sent to your provider.','status':'Pending','priority':priority}

@app.get('/bookings')
def get_bookings(worker_id: Optional[int]=None, customer_name: Optional[str]=None):
    query='SELECT bookings.*, workers.name AS worker_name, workers.avatar, workers.price FROM bookings JOIN workers ON workers.id=bookings.worker_id WHERE 1=1'; args=[]
    if worker_id: query+=' AND worker_id=?'; args.append(worker_id)
    if customer_name: query+=' AND customer_name=?'; args.append(customer_name)
    return rows(query+' ORDER BY preferred_date DESC',args)

@app.get('/bookings/{booking_id}')
def get_booking(booking_id:int):
    found=rows('SELECT * FROM bookings WHERE id=?',(booking_id,))
    if not found: raise HTTPException(404,'Booking not found')
    return found[0]

@app.put('/bookings/{booking_id}/status')
def set_status(booking_id:int,data:BookingStatus):
    allowed={'Pending','Accepted','Rejected','In Progress','Completed','Cancelled'}
    if data.status not in allowed: raise HTTPException(422,'Invalid status')
    with connection() as con:
        if not con.execute('SELECT id FROM bookings WHERE id=?',(booking_id,)).fetchone(): raise HTTPException(404,'Booking not found')
        con.execute('UPDATE bookings SET status=? WHERE id=?',(data.status,booking_id))
    return {'id':booking_id,'status':data.status}

@app.post('/group-bookings', status_code=201)
def create_group_booking(data: GroupBookingCreate):
    with connection() as con:
        cur=con.execute('INSERT INTO group_bookings(service,date,location,description,creator_name,created_at) VALUES(?,?,?,?,?,?)',(data.service,data.date,data.location,data.description,data.customer_name,datetime.now().isoformat()))
        group_id=cur.lastrowid
        con.execute('INSERT INTO group_booking_members(group_id,member_name) VALUES(?,?)',(group_id,data.customer_name))
    return {'id':group_id,'message':'Group booking created — invite your neighbours to join.'}

@app.get('/group-bookings')
def get_group_bookings():
    groups=rows('SELECT group_bookings.*, COUNT(group_booking_members.id) AS participants FROM group_bookings LEFT JOIN group_booking_members ON group_booking_members.group_id=group_bookings.id GROUP BY group_bookings.id ORDER BY group_bookings.id DESC')
    for group in groups:
        n=group['participants']; group['discount_percent']=10 if n>=5 else 5 if n>=3 else 0
    return groups

@app.post('/group-bookings/{group_id}/join')
def join_group_booking(group_id:int, customer_name: str='Demo Customer'):
    with connection() as con:
        if not con.execute('SELECT id FROM group_bookings WHERE id=?',(group_id,)).fetchone(): raise HTTPException(404,'Group booking not found')
        try: con.execute('INSERT INTO group_booking_members(group_id,member_name) VALUES(?,?)',(group_id,customer_name))
        except sqlite3.IntegrityError: raise HTTPException(409,'You already joined this group booking')
    return {'message':'You joined the group booking.'}

@app.post('/community-help', status_code=201)
def create_community_help(data: CommunityHelpCreate):
    with connection() as con:
        cur=con.execute('INSERT INTO community_help(title,help_type,location,description,requester_name,created_at) VALUES(?,?,?,?,?,?)',(data.title,data.help_type,data.location,data.description,data.requester_name,datetime.now().isoformat()))
    return {'id':cur.lastrowid,'message':'Community help request posted.'}

@app.get('/community-help')
def get_community_help():
    return rows('SELECT community_help.*, COUNT(help_volunteers.id) AS volunteers FROM community_help LEFT JOIN help_volunteers ON help_volunteers.help_id=community_help.id GROUP BY community_help.id ORDER BY community_help.id DESC')

@app.post('/community-help/{help_id}/volunteer')
def volunteer(help_id:int, volunteer_name: str='Demo Neighbour'):
    with connection() as con:
        if not con.execute('SELECT id FROM community_help WHERE id=?',(help_id,)).fetchone(): raise HTTPException(404,'Help request not found')
        try: con.execute('INSERT INTO help_volunteers(help_id,volunteer_name) VALUES(?,?)',(help_id,volunteer_name))
        except sqlite3.IntegrityError: raise HTTPException(409,'You already volunteered')
    return {'message':'Thanks for volunteering!'}

@app.put('/community-help/{help_id}/resolve')
def resolve_help(help_id:int):
    with connection() as con:
        if not con.execute('SELECT id FROM community_help WHERE id=?',(help_id,)).fetchone(): raise HTTPException(404,'Help request not found')
        con.execute("UPDATE community_help SET status='Resolved' WHERE id=?",(help_id,))
    return {'message':'Community request marked resolved.'}

@app.post('/service-suggestion')
def suggest(data:SuggestionRequest):
    text=data.description.lower()
    lookup={'Appliance Repair':['washing','fridge','refrigerator','ac ','air conditioner','microwave','leaking machine'],'Plumbing':['leak','tap','pipe','drain','toilet','water'], 'Electrical':['switch','wire','fan','power','socket','light'], 'Cleaning':['clean','stain','dust','mop'], 'Carpentry':['door','wood','shelf','furniture','cabinet'], 'Painting':['paint','wall','colour'], 'Home Tutoring':['tutor','math','science','homework']}
    for service, terms in lookup.items():
        if any(t in text for t in terms): return {'suggestion':service,'confidence':'High','message':f'This sounds like {service}.'}
    return {'suggestion':'Community Services','confidence':'Medium','message':'A local VConnect member can help assess this request.'}

@app.get('/admin/summary')
def admin_summary():
    completed=rows("SELECT count(*) AS n FROM bookings WHERE status='Completed'")[0]['n']
    members=rows('SELECT count(*) AS n FROM memberships')[0]['n']
    active=rows('SELECT count(*) AS n FROM workers WHERE available=1')[0]['n']
    return {'members':members,'active_workers':active,'completed_services':completed,'community_earnings':completed*450+12650,'commission':'For every ₹500 service: ₹460 goes to the worker and ₹40 (8%) funds cooperative training, support, and local community programs.','members_list':rows('SELECT workers.name,workers.category,workers.rating,workers.avatar,memberships.joined_at FROM memberships JOIN workers ON workers.id=memberships.worker_id')}
