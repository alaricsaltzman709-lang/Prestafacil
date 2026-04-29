
/**
 * Simple Google Drive API helper
 */

export async function getDriveAccessToken() {
  // In a real Firebase app, we'd get this from the user's credential
  // For this environment, we'll assume the user has authed with Google
  // and we'll handle the flow if possible.
  // Note: Firebase signInWithPopup returns a UserCredential which has the accessToken
  // if we save it.
  return localStorage.getItem('google_access_token');
}

export async function driveRequest(path: string, options: RequestInit = {}) {
  const token = await getDriveAccessToken();
  if (!token) throw new Error("No Google Drive access token found");

  const res = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Drive API Error");
  }

  return res.json();
}

export async function findOrCreateFolder(folderName: string, parentId?: string) {
  let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
  if (parentId) {
    query += ` and '${parentId}' in parents`;
  }
  const data = await driveRequest(`files?q=${encodeURIComponent(query)}`);
  
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }

  const body: any = {
    name: folderName,
    mimeType: 'application/vnd.google-apps.folder'
  };
  
  if (parentId) {
    body.parents = [parentId];
  }

  const createRes = await driveRequest('files', {
    method: 'POST',
    body: JSON.stringify(body)
  });

  return createRes.id;
}

export async function syncLoansToDrive(loans: any, userId: string, businessName: string) {
  try {
    const mainFolderId = await findOrCreateFolder('Prestafacil_Data');
    const userFolderName = `${businessName || 'Usuario'}_${userId.substring(0, 5)}`;
    const userFolderId = await findOrCreateFolder(userFolderName, mainFolderId);
    
    const fileName = 'loans.json';
    const query = `name = '${fileName}' and '${userFolderId}' in parents and trashed = false`;
    const data = await driveRequest(`files?q=${encodeURIComponent(query)}`);

    const fileMetadata = {
      name: fileName,
      parents: [userFolderId]
    };

    const media = {
      mimeType: 'application/json',
      body: JSON.stringify(loans, null, 2)
    };

    if (data.files && data.files.length > 0) {
      const fileId = data.files[0].id;
      // Update existing file
      // Drive API v3 update requires a multipart upload for content + metadata or just upload
      // For simplicity, we use the simple upload endpoint for content
      const token = await getDriveAccessToken();
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loans)
      });
    } else {
      // Create new file
      // Simple create followed by upload or multipart
      const createRes = await driveRequest('files', {
        method: 'POST',
        body: JSON.stringify(fileMetadata)
      });
      
      const token = await getDriveAccessToken();
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${createRes.id}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loans)
      });
    }
  } catch (error) {
    console.error("Drive Sync Error:", error);
  }
}
