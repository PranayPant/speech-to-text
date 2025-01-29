import os
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload

from ..types import FileUploadRequest

SCOPES = ["https://www.googleapis.com/auth/drive"]
SERVICE_ACCOUNT_FILE = './service-account.secret.json'

if not os.path.exists(SERVICE_ACCOUNT_FILE):
  with open(SERVICE_ACCOUNT_FILE, 'w') as f:
    credentials = os.getenv('GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS')
    f.write(os.getenv('GOOGLE_DRIVE_SERVICE_ACCOUNT_CREDENTIALS') or "")

credentials = service_account.Credentials.from_service_account_file(
  SERVICE_ACCOUNT_FILE,
  scopes=SCOPES
)

drive_service = build('drive', 'v3', credentials=credentials)

def upload_to_google_drive(params: FileUploadRequest) -> dict:
  
  text, file_name, properties = params.text, params.file_name, params.properties

  with open(file_name, 'w') as f:
    f.write(text)

  try:
    file_metadata = {
      'name': file_name,
      'parents': [os.getenv('GOOGLE_DRIVE_SRT_FOLDER_ID')],
      'properties': properties
    }
    media = MediaFileUpload(file_name, mimetype='text/plain')
    file = drive_service.files().create(
      body=file_metadata,
      media_body=media,
      fields='id'
    ).execute()
    print(f"Uploaded file to Google Drive: {file.get('id')}")
  except Exception as error:
    print(f"Error uploading file to Google Drive: {error}")
    raise error
  finally:
    try:
      os.remove(file_name)
    except Exception as error:
      print(f"Error deleting file: {error}")

  return {'file_id': file.get('id')}

def get_file_info(file_id: str) -> dict:
  try:
    file = drive_service.files().get(
      fileId=file_id,
      fields='name,webViewLink,properties'
    ).execute()
  except Exception as error:
    print(f"Error getting file info from Google Drive: {error}")
    raise error

  return {
    'name': file.get('name'),
    'webViewLink': file.get('webViewLink'),
    'properties': file.get('properties')
  }
