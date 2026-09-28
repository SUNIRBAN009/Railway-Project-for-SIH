import urllib.request
import json

url = 'http://127.0.0.1:8000/api/v1/analytics/dashboard/summary/?corridor=NDLS-CNB-MAIN&range=7d'
req = urllib.request.Request(url)

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Success without auth:", data.get('data', {}).get('executive_cards'))
except urllib.error.HTTPError as e:
    print(f"HTTPError: {e.code} {e.reason}")
    # Let's get an auth token if 401
    login_url = 'http://127.0.0.1:8000/api/v1/auth/login/'
    login_data = json.dumps({"username": "chief_controller", "password": "Password@123"}).encode('utf-8')
    l_req = urllib.request.Request(login_url, data=login_data, headers={'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(l_req) as l_resp:
            l_json = json.loads(l_resp.read().decode('utf-8'))
            token = l_json.get('data', {}).get('tokens', {}).get('access') or l_json.get('data', {}).get('access_token')
            print("Logged in, token:", token[:15] if token else "No token")
            auth_req = urllib.request.Request(url, headers={'Authorization': f'Bearer {token}'})
            with urllib.request.urlopen(auth_req) as a_resp:
                res = json.loads(a_resp.read().decode('utf-8'))
                print("Cards with auth:", res.get('data', {}).get('executive_cards'))
    except Exception as login_err:
        print("Login err:", login_err)
except Exception as e:
    print("Other err:", e)
