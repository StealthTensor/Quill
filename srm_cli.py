import argparse
import requests
import json
import sys
import os

BASE_URL = "https://dld.srmist.edu.in/ktretecurricula/server/curricula"
CONFIG_FILE = os.path.expanduser("~/.srm_cli_config")

def get_token(username, password):
    creds = {"USER_ID": username, "PASSWORD": password, "key": "john"}
    try:
        res = requests.post(f"{BASE_URL}/login", json=creds)
        data = res.json()
        if data.get("Status") == 1:
            return data["token"]
        else:
            print("Login failed:", data)
            return None
    except Exception as e:
        print("Error logging in:", e)
        return None

def save_config(username, token):
    with open(CONFIG_FILE, "w") as f:
        json.dump({"username": username, "token": token}, f)

def load_config():
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, "r") as f:
            return json.load(f)
    return None

def login(args):
    print(f"Logging in as {args.username}...")
    token = get_token(args.username, args.password)
    if token:
        save_config(args.username, token)
        print("Login successful!")

def profile(args):
    cfg = load_config()
    if not cfg:
        print("Not logged in. Please run 'login' command first.")
        return
    
    headers = {"Authorization": cfg["token"]}
    payload = {"USER_ID": cfg["username"], "key": "john"}
    res = requests.post(f"{BASE_URL}/getprofile", json=payload, headers=headers)
    data = res.json()
    if data.get("Status") == 1:
        user = data["user"]
        print(f"--- PROFILE ---")
        print(f"Name: {user.get('FIRST_NAME')} {user.get('LAST_NAME')}")
        print(f"Dept: {user.get('DEPARTMENT')}")
        print(f"Role: {user.get('ROLE')}")
        print("Slots:")
        for s in user.get("SLOT", []):
            print(f"  - {s.get('COURSE_CODE')} (Sem {s.get('SEMESTER')}) - Batch {s.get('BATCH_ID')}")
    else:
        print("Error fetching profile:", data)

def courses(args):
    cfg = load_config()
    if not cfg:
        print("Not logged in. Please run 'login' command first.")
        return
    
    headers = {"Authorization": cfg["token"]}
    payload = {"USER_ID": cfg["username"], "key": "john"}
    res = requests.post(f"{BASE_URL}/student/home/getcourses", json=payload, headers=headers)
    data = res.json()
    if data.get("Status") == 1:
        print(f"--- COURSES ---")
        for c in data.get("courses", []):
            print(f"[{c.get('COURSE_CODE')}] {c.get('COURSE_NAME')}")
            print(f"  Batch: {c.get('BATCH_NAME')} ({c.get('BATCH_ID')})")
            print(f"  Faculty: {c.get('FACULTY_NAME')}")
            print(f"  Completion: {c.get('completion')}%")
            print("")
    else:
        print("Error fetching courses:", data)

def timetable(args):
    cfg = load_config()
    if not cfg:
        print("Not logged in. Please run 'login' command first.")
        return
    
    headers = {"Authorization": cfg["token"]}
    payload = {"USER_ID": cfg["username"], "key": "john"}
    res = requests.post(f"{BASE_URL}/student/timetable/get", json=payload, headers=headers)
    try:
        data = res.json()
        if data.get("Status") == 1:
            print("--- TIMETABLE ---")
            print(json.dumps(data, indent=2))
        else:
            print("Error fetching timetable:", data)
    except json.JSONDecodeError:
        print("Error fetching timetable: Server returned non-JSON response:")
        print(res.text)

def main():
    parser = argparse.ArgumentParser(description="SRM Academia Terminal Client")
    subparsers = parser.add_subparsers(dest="command")
    
    parser_login = subparsers.add_parser("login", help="Login to SRM")
    parser_login.add_argument("username", help="Your USER ID (e.g. RAXXXXXX)")
    parser_login.add_argument("password", help="Your password")
    
    parser_profile = subparsers.add_parser("profile", help="View your profile")
    parser_courses = subparsers.add_parser("courses", help="View your enrolled courses")
    parser_timetable = subparsers.add_parser("timetable", help="View your timetable")
    
    args = parser.parse_args()
    
    if args.command == "login":
        login(args)
    elif args.command == "profile":
        profile(args)
    elif args.command == "courses":
        courses(args)
    elif args.command == "timetable":
        timetable(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
