export interface IFaceDetectRes {
    faceId: string;
    faceRectangle: FaceRectangle;
}

export interface FaceRectangle {
    top: number;
    left: number;
    width: number;
    height: number;
}
