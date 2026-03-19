/* eslint-disable camelcase */
import {BaseExternalAccountClient, OAuth2Client} from 'google-auth-library';
import {drive_v3, google} from 'googleapis';
import fs from 'fs';

class GoogleDrive {
  public static service: drive_v3.Drive | null;

  public static initialize(auth: BaseExternalAccountClient | OAuth2Client) {
    if (!GoogleDrive.service) {
      GoogleDrive.service = google.drive({version: 'v3', auth});
    }
  }

  public static createFolder({name, parents}: {
        name: string; // Folder name
        parents: string[]; // Parent folders array
    }): Promise<string> {
    return new Promise((resolve, reject) => {
      this.mustInitialize();
      if (GoogleDrive.service === null) {
        return reject(new Error('The Google Drive Service must be initialized before use!'));
      }
      GoogleDrive.service.files.create({
        requestBody: {
          name: (name as string),
          mimeType: 'application/vnd.google-apps.folder',
          parents: (parents as string[]),
        },
      }).then((res) => {
        if (res.data.id) {
          resolve(res.data.id);
        } else {
          reject(new Error('Created file does not have an id'));
        }
      }).catch(reject);
    });
  }

  public static async uploadFile({name, mimeType, body, parents, makePublic}: {
        name: string;
        mimeType: string;
        body: fs.ReadStream;
        parents?: string[];
        makePublic?: boolean
    }) {
    return new Promise((resolve, reject) => {
      this.mustInitialize();
      if (GoogleDrive.service === null) {
        return Promise.reject(new Error('The Google Drive Service must be initialized before use!'));
      }
      GoogleDrive.service.files.create({
        requestBody: {
          name: (name as string),
          mimeType: (mimeType as string),
          parents: (parents as string[]),
        },
        media: {mimeType: (mimeType as string), body},
      }).then((res) => {
        if (!makePublic) {
          resolve(res.data.id);
        } else if (res.data.id) {
          console.log('Changing file access to public');
          this.makeItemPublic(res.data.id).then(() => {
            resolve(res.data.id);
            console.log('Changed file access to public');
          });
        } else {
          reject(new Error('Created file does not have an id'));
        }
      }).catch(reject);
    });

    // try {
    //     const createRes = await GoogleDrive.service.files.create({
    //         requestBody: { name, mimeType, parents },
    //         media: { mimeType, body },
    //     });
    //     if (createRes.data.id) {
    //         const makeItemPublicRes = await this.makeItemPublic(createRes.data.id);
    //         return createRes.data.id;
    //     }
    //     return
    // } catch (error) {

    // }
  }
  public static deleteFile(fileId: string) {
    return new Promise((resolve, reject) => {
      this.mustInitialize();
      if (GoogleDrive.service === null) {
        return reject(new Error('The Google Drive Service must be initialized before use!'));
      }
      GoogleDrive.service.files.delete({fileId}).then(resolve).catch(reject);
    });
  }

  public static makeItemPublic(fileId: string) {
    return new Promise((resolve, reject) => {
      this.mustInitialize();
      if (GoogleDrive.service === null) {
        return reject(new Error('The Google Drive Service must be initialized before use!'));
      }
      GoogleDrive.service.permissions.create({
        fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      }).then(resolve).catch(reject);
    });
  }

  private static mustInitialize() {
    if (!GoogleDrive.service) {
      throw new Error('The Google Drive Service must be initialized before use!');
    }
  }
}

export default GoogleDrive;
