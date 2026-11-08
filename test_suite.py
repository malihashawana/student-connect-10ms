import urllib.request, urllib.parse, json, sys

sys.stdout.reconfigure(encoding='utf-8')
BASE = 'http://localhost:5000'

def post(url, data, token=None):
    req = urllib.request.Request(f'{BASE}{url}', data=json.dumps(data).encode('utf-8'), headers={
        'Content-Type': 'application/json',
        **({'Authorization': f'Bearer {token}'} if token else {})
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

def get(url, token=None):
    clean_url = urllib.parse.quote(url, safe='/?=&')
    req = urllib.request.Request(f'{BASE}{clean_url}', headers={
        **({'Authorization': f'Bearer {token}'} if token else {})
    })
    try:
        with urllib.request.urlopen(req) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode('utf-8'))

print('=== 1. Checking SPA HTML Delivery ===')
with urllib.request.urlopen(f'{BASE}/') as r:
    html = r.read().decode('utf-8')
    assert '<div id="root">' in html
    print('  [PASS] SPA frontend index.html served cleanly')

print('\n=== 2. Catalog and Google Sheet Column G data ===')
s, catalog = get('/api/catalog?subject=Bangla 1st Paper')
assert s == 200
assert catalog['total'] > 0
print(f'  [PASS] Catalog returned {catalog["total"]} items from 10MS Sheet')

print('\n=== 3. Pre-Approved Roster Verification ===')
s, res = post('/api/auth/verify-roster', {'tms_id': 'TMS-2026-90003', 'phone': '01900334455', 'program': 'HSC 27'})
assert s == 200 and res['success']
print('  [PASS] Valid unclaimed TMS verified successfully')

s, res = post('/api/auth/verify-roster', {'tms_id': 'TMS-FAKE-999', 'phone': '01900334455', 'program': 'HSC 27'})
assert s == 400
print('  [PASS] Invalid TMS properly rejected')

s, res = post('/api/auth/verify-roster', {'tms_id': 'TMS-2026-78901', 'phone': '01711000001', 'program': 'HSC 28'})
assert s == 400 and 'already been registered' in res['error']
print('  [PASS] Already claimed TMS properly rejected')

print('\n=== 4. Student Registration Wizard ===')
s, reg = post('/api/auth/register', {
    'tms_id': 'TMS-2026-90003',
    'phone': '01900334455',
    'password': 'password123',
    'full_name': 'Arman Mallik',
    'program': 'HSC 27',
    'department': 'Humanities',
    'college': 'Dhaka City College',
    'district': 'Dhaka'
})
assert s == 201
student_token = reg['token']
student_user = reg['user']
print(f'  [PASS] Student registered and JWT issued for user {student_user["id"]}')

print('\n=== 5. Student Login ===')
s, login = post('/api/auth/login', {'phone': '01900334455', 'password': 'password123'})
assert s == 200 and login['token']
print('  [PASS] Subsequent login succeeded without re-onboarding')

print('\n=== 6. Upcoming Classes Filtered by Department ===')
s, classes = get('/api/classes/upcoming', token=student_token)
assert s == 200
assert len(classes['classes']) > 0
print(f'  [PASS] Department-filtered upcoming classes returned {len(classes["classes"])} sessions')

print('\n=== 7. Issue Reporting with Bengali Specifications ===')
s, tkt_class = post('/api/tickets', {
    'category': 'Class',
    'program': 'HSC 27',
    'department': 'Humanities',
    'subject': 'Economics 1st Paper',
    'title': 'লাইভ ক্লাসে অডিও সমস্যা',
    'description': 'ক্লাস চলাকালীন শব্দ কেটে কেটে যাচ্ছিল।',
    'context_details': {
        'class_type': 'Live Class',
        'class_date': '2026-10-25',
        'session_title': 'অর্থনীতির মৌলিক ধারণা'
    }
}, token=student_token)
assert s == 201
print(f'  [PASS] Class ticket with Live Class & date created: {tkt_class["ticket"]["id"]}')

s, tkt_exam = post('/api/tickets', {
    'category': 'Exam',
    'program': 'HSC 27',
    'department': 'Humanities',
    'subject': 'Civics 1st Paper',
    'title': 'ডেইলি এক্সাম অপশন এরর',
    'description': 'ডেইলি এক্সামের ৪ নং প্রশ্নে দুটি সঠিক উত্তর ছিল।',
    'context_details': {
        'exam_type': 'Daily Exam',
        'exam_date': 'N/A',
        'is_date_na': True,
        'exam_title': 'ব্রিটিশ ভারতে প্রতিনিধিত্বশীল সরকার'
    }
}, token=student_token)
assert s == 201
print(f'  [PASS] Exam ticket with Daily Exam & N/A date created: {tkt_exam["ticket"]["id"]}')

print('\n=== 8. Captain Workflows ===')
s, capt_login = post('/api/auth/login', {'phone': '01711000001', 'password': 'captain123'})
assert s == 200
capt_token = capt_login['token']

s, verify_st = get('/api/captain/verify-student?phone=01811000002', token=capt_token)
assert s == 200 and verify_st['student']['full_name']
print(f'  [PASS] Captain verified student: {verify_st["student"]["full_name"]}')

s, capt_tkt = post('/api/tickets', {
    'category': 'App/Website',
    'program': 'HSC 28',
    'department': 'Science',
    'subject': 'General',
    'title': 'ভিডিও প্লেয়ার ব্ল্যাক স্ক্রিন',
    'description': 'ছাত্রীর ফোনে ভিডিও চালু করলে শুধু কালো স্ক্রিন আসছে।',
    'affected_scope': 'specific_student',
    'affected_student_phone': '01811000002',
    'context_details': {'app_platform': 'Android App', 'app_version': 'v4.8.2'}
}, token=capt_token)
assert s == 201
capt_tkt_id = capt_tkt['ticket']['id']
print(f'  [PASS] Captain submitted ticket on behalf of student: {capt_tkt_id}')

s, esc = post(f'/api/tickets/{capt_tkt_id}/escalate', {'reason': 'জরুরি পরীক্ষা কাল সকালে'}, token=capt_token)
assert s == 200 and esc['ticket']['priority'] == 'Urgent'
print('  [PASS] Captain escalated ticket to Urgent priority')

print('\n=== 9. Staff / Admin Issue Desk & Security Checks ===')
s, err = get('/api/admin/roster', token=student_token)
assert s == 403
print('  [PASS] Server-side RBAC: Student access to admin roster blocked (403)')

s, err = get(f'/api/tickets/{capt_tkt_id}', token=student_token)
assert s == 403
print('  [PASS] Data isolation: Student cannot access other tickets (403)')

s, staff_login = post('/api/auth/staff-login', {'staff_id': 'STAFF-1001', 'password': 'admin123'})
assert s == 200 and staff_login['token']
staff_token = staff_login['token']
print('  [PASS] Dedicated staff authentication succeeded')

s, note = post(f'/api/tickets/{capt_tkt_id}/messages', {
    'message': 'DevOps team notified about Android DRM decoder error.',
    'is_internal': True
}, token=staff_token)
assert s == 201
print('  [PASS] Staff added internal note successfully')

req_patch = urllib.request.Request(f'{BASE}/api/tickets/{capt_tkt_id}', data=json.dumps({
    'status': 'Resolved',
    'resolution_notes': 'ভিডিও ক্যাশ ক্লিয়ার এবং অ্যাপ v4.8.3 প্যাচ পুশ করা হয়েছে।'
}).encode('utf-8'), headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {staff_token}'}, method='PATCH')
with urllib.request.urlopen(req_patch) as r:
    res = json.loads(r.read().decode('utf-8'))
    assert res['ticket']['status'] == 'Resolved'
print('  [PASS] Staff resolved ticket with resolution notes and audit trigger')

print('\n=========================================')
print(' ALL 9 TEST SUITES PASSED SUCCESSFULLY! ')
print('=========================================')
