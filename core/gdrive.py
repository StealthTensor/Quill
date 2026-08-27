import os
import pickle
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request
from googleapiclient.http import MediaFileUpload

# If modifying these scopes, delete the file token.pickle.
SCOPES = ['https://www.googleapis.com/auth/drive.file']

class GDriveClient:
    def __init__(self, credentials_file='client_secrets.json', token_file='token.pickle'):
        self.credentials_file = credentials_file
        self.token_file = token_file
        self.creds = None
        self.service = None
        self.folder_id = None

    def is_authenticated(self):
        """Check if we have valid credentials without triggering a login flow."""
        if os.path.exists(self.token_file):
            with open(self.token_file, 'rb') as token:
                self.creds = pickle.load(token)
        
        if self.creds and self.creds.valid:
            return True
        if self.creds and self.creds.expired and self.creds.refresh_token:
            try:
                self.creds.refresh(Request())
                return True
            except Exception:
                return False
        return False

    def authenticate(self):
        """Perform OAuth flow and initialize the Drive service."""
        if not self.is_authenticated():
            if not os.path.exists(self.credentials_file):
                raise FileNotFoundError(
                    f"Missing {self.credentials_file}. You must download your Google Cloud "
                    "OAuth client ID JSON and place it in the root directory."
                )
            
            flow = InstalledAppFlow.from_client_secrets_file(self.credentials_file, SCOPES)
            # Run local server on an open port for the redirect callback
            self.creds = flow.run_local_server(port=0)
            
            # Save the credentials for the next run
            with open(self.token_file, 'wb') as token:
                pickle.dump(self.creds, token)
        
        self.service = build('drive', 'v3', credentials=self.creds)
        self._ensure_folder_exists()
        return True

    def _ensure_folder_exists(self, folder_name="Quill"):
        """Ensure the target upload folder exists in the user's Drive."""
        if not self.service:
            raise Exception("Not authenticated")

        query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
        results = self.service.files().list(q=query, spaces='drive', fields='files(id, name)').execute()
        items = results.get('files', [])

        if not items:
            folder_metadata = {
                'name': folder_name,
                'mimeType': 'application/vnd.google-apps.folder'
            }
            folder = self.service.files().create(body=folder_metadata, fields='id').execute()
            self.folder_id = folder.get('id')
        else:
            self.folder_id = items[0].get('id')

    def upload_file(self, filepath: str, filename: str) -> str:
        """Uploads a file to Drive, sets it to anyone with link can view, and returns the view URL."""
        if not self.service or not self.folder_id:
            self.authenticate()

        file_metadata = {
            'name': filename,
            'parents': [self.folder_id]
        }
        
        media = MediaFileUpload(filepath, mimetype='application/vnd.openxmlformats-officedocument.wordprocessingml.document', resumable=True)
        
        file = self.service.files().create(
            body=file_metadata,
            media_body=media,
            fields='id, webViewLink'
        ).execute()
        
        file_id = file.get('id')
        
        # Set permissions so anyone with the link can view
        permission = {
            'type': 'anyone',
            'role': 'reader'
        }
        self.service.permissions().create(
            fileId=file_id,
            body=permission,
            fields='id'
        ).execute()

        return file.get('webViewLink')
