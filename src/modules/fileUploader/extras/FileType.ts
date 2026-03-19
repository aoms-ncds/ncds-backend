
export interface IFile{
    name: string;
    size: number;
    type: FileObjectType;
    storage: 'S3' | 'Drive';
    fileId: string;
    downloadURL: string | null;
    private: boolean;
    module:string;
  }
  type FileObjectType =
    | 'application/vnd.ms-excel'
    | 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    | 'application/pdf'
    | 'video/quicktime'
    | 'image/png'
    | `video/${string}`
    | `image/${string}`;
