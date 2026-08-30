import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
from typing import Dict, Any

class SRMClient:
    def __init__(self):
        self.base_url = "https://dld.srmist.edu.in/ktretecurricula/server/curricula"
        self.session = requests.Session()
        
        # Configure retries for 504 Gateway Timeout
        retries = Retry(total=3, backoff_factor=1, status_forcelist=[504])
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)
        
        self.auth_token = None
        self.user_id = None

    def _get_headers(self) -> Dict[str, str]:
        headers = {}
        if self.auth_token:
            headers["Authorization"] = self.auth_token
        return headers

    def _post(self, endpoint: str, payload: Dict[str, Any]) -> Dict[str, Any]:
        payload["key"] = "john"
        if self.user_id and "USER_ID" not in payload:
            payload["USER_ID"] = self.user_id
            
        try:
            response = self.session.post(
                f"{self.base_url}/{endpoint}",
                json=payload,
                headers=self._get_headers(),
                timeout=15
            )
            response.raise_for_status()
            try:
                return response.json()
            except ValueError:
                print(f"Non-JSON response from {endpoint}")
                return {"Status": 0, "Message": "Server returned invalid JSON"}
        except requests.exceptions.RequestException as e:
            return {"Status": 0, "Message": str(e)}

    def login(self, username: str, password: str) -> Dict[str, Any]:
        response = self._post("login", {"USER_ID": username, "PASSWORD": password})
        if response.get("Status") == 1 and "token" in response:
            # Note: The weird space in 'Bearer :' is actually required by their backend
            self.auth_token = response["token"]
            if not self.auth_token.startswith("Bearer "):
                self.auth_token = f"Bearer :{self.auth_token}"
            self.user_id = username
        return response

    def get_profile(self) -> Dict[str, Any]:
        return self._post("getprofile", {})

    def get_courses(self) -> Dict[str, Any]:
        return self._post("student/home/getcourses", {})

    def get_session_status(self, course_info: Dict[str, Any]) -> Dict[str, Any]:
        return self._post("student/session/getsessionstatus", {
            "COURSE_INFO": course_info
        })

    def get_circle_info(self, course_code: str) -> Dict[str, Any]:
        """Full learning-session tree for a course (the portal's 'sunburst').
        Returns {'Status':1,'flare':{children:[unit -> session -> slo]}} where
        each SLO node carries course.SESSION, key ('<session><slo>') and Status
        (0=not started, 1=in progress, 2=completed)."""
        return self._post("student/course/getcircleinfo", {
            "data": {
                "COURSE_CODE": course_code,
                "COURSE_NAME": course_code,
                "USER_ID": self.user_id,
                "title": "course_learning_session",
            }
        })

    def get_worksheet_url(self, course_code: str, session_num: int, slo_num: int,
                          ext: str = "docx") -> str | None:
        """Resolve the download URL of a session's blank practice worksheet
        (slp = SLO practice). filename is '<session><slo>.<ext>', e.g. 1031.docx."""
        resp = self._post("admin/file/getfile", {
            "path": f"data/coordinator/{course_code}/slp",
            "filename": f"{session_num}{slo_num}.{ext}",
            "server": "https://dld.srmist.edu.in/etecurricula/server",
        })
        if resp.get("Status") == 1:
            return (resp.get("result") or {}).get("path")
        return None

    def download_worksheet(self, url: str) -> bytes | None:
        """Fetch the worksheet bytes from a get_worksheet_url() path."""
        try:
            r = self.session.get(url, headers=self._get_headers(), timeout=30)
            r.raise_for_status()
            return r.content
        except requests.exceptions.RequestException:
            return None

    def get_questions(self, course_info: Dict[str, Any], slot: list, session_num: int) -> Dict[str, Any]:
        return self._post("student/session/getquestions", {
            "COURSE_INFO": course_info,
            "SLOT": slot,
            "SESSION": session_num,
            "MCQ": "5",
            "SQ": "2",
            "LQ": "1"
        })

    def submit_mcq(self, course_info: Dict[str, Any], session_num: int, score_pct: float) -> Dict[str, Any]:
        return self._post("student/session/mcq", {
            "COURSE_INFO": course_info,
            "SESSION": session_num,
            "mcq": str(score_pct)
        })

    def submit_link(self, course_info: Dict[str, Any], session_num: int, slo_num: int, link: str) -> Dict[str, Any]:
        return self._post("student/session/submitlink", {
            "COURSE_INFO": course_info,
            "SESSION": session_num,
            "SLO": slo_num,
            "session": f"{session_num}{slo_num}", # Their weird string concat
            "LINK": link
        })
