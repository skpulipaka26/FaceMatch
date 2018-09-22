export interface IFaceDetectRes {
    faceId: string;
    faceRectangle: FaceRectangle;
    faceAttributes: FaceAttribute;
}

export interface FaceRectangle {
    top: number;
    left: number;
    width: number;
    height: number;
}

export interface FaceAttribute {
    gender: string;
}
