import { Component, ViewChild, ElementRef, OnInit, TemplateRef } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';

import { MatDialog } from '@angular/material/dialog';

import { environment } from '../environments/environment';

import { IFaceDetectRes } from '../interfaces/face-detect.interface';
import { IFaceVerifyRes } from '../interfaces/face-verify.interface';
import { SwalComponent } from '@toverux/ngx-sweetalert2';
import { SweetAlertOptions } from 'sweetalert2';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  image1: File;
  image1URI: string;
  image2URI: string;
  image2: File;
  comparing: boolean;
  video: HTMLVideoElement;
  currentContainer: number;
  @ViewChild('swalRef') private swal: SwalComponent;
  @ViewChild('videoElement') videoElement: ElementRef;

  constructor(private http: HttpClient, public dialog: MatDialog) { }

  ngOnInit() {
  }

  async onCapture(captureImageRef: TemplateRef<any>, container: number) {
    this.dialog.open(captureImageRef);
    this.video = document.getElementById('video') as HTMLVideoElement;
    const config = { video: true, audio: false };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(config);
      this.video.srcObject = stream;
      this.video.play();
      this.video.onclick = this.videoClickHandler;
      this.currentContainer = container;
    } catch (error) {
      console.log('error');
    }
  }

  async onCaptureImage() {
    this.video.click();
  }

  onClick() {
    this.video.click();
  }

  onCloseVideoCapture() {
    this.stop(this.video.srcObject);
  }

  videoClickHandler = () => {
    const videoSnap = this.video;
    const canvas = document.createElement('canvas');
    canvas.width = videoSnap.videoWidth;
    canvas.height = videoSnap.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoSnap, 0, 0);
    canvas.toBlob(async (b) => {
      const file = new File([b], `imageRef.jpg`, { type: 'image/jpeg' });
      if (this.currentContainer === 0) {
        this.image1 = file;
        this.image1URI = await this.getImageURI(file);
      } else {
        this.image2 = file;
        this.image2URI = await this.getImageURI(file);
      }
    });
    this.dialog.closeAll();
    this.onCloseVideoCapture();
  }

  stop(stream) {
    if (!stream) {
      return;
    }
    stream.getTracks().forEach(track => track.stop());
  }

  showImage(container: number) {
    if (container === 0) {
      return this.image1URI !== undefined && this.image1URI !== null;
    } else {
      return this.image2URI !== undefined && this.image2URI !== null;
    }
  }

  getImageSource(container: number) {
    if (container === 0) {
      return this.image1URI;
    } else {
      return this.image2URI;
    }
  }

  async uploadFile(event, container: number) {
    const file = event.target.files[0];
    if (container === 0) {
      this.image1 = file;
      this.image1URI = await this.getImageURI(file);
    } else {
      this.image2 = file;
      this.image2URI = await this.getImageURI(file);
    }
  }

  getImageURI(file: File): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event: any) => {
        resolve(event.target.result);
      };
    });
  }

  onCompare() {
    this.comparing = true;
    const faceDetect1$ = this.faceDetect(this.image1);
    const faceDetect2$ = this.faceDetect(this.image2);
    let detectRes: Array<Array<IFaceDetectRes>>;
    forkJoin(faceDetect1$, faceDetect2$).pipe(
      switchMap(res => {
        detectRes = res;
        const faceId1 = res[0][0].faceId;
        const faceId2 = res[1][0].faceId;
        const httpOptions = {
          headers: new HttpHeaders({
            'Content-Type': 'application/json',
            'Ocp-Apim-Subscription-Key': environment.facedetectionapikey
          })
        };
        return this.http.post('https://westus.api.cognitive.microsoft.com/face/v1.0/verify',
          {
            faceId1: faceId1,
            faceId2: faceId2
          }, httpOptions) as Observable<IFaceVerifyRes>;
      })
    ).subscribe(v => {
      this.comparing = false;
      let swalOptions: SweetAlertOptions;
      if (v.isIdentical) {
        swalOptions = {
          title: `match`,
          text: `confidence: ${v.confidence * 100} %`,
          type: 'success',
          confirmButtonText: 'great'
        };
      } else {
        const gender1 = detectRes[0][0].faceAttributes.gender;
        const gender2 = detectRes[1][0].faceAttributes.gender;
        swalOptions = {
          // title: gender1 === gender2 ? 'not a match' : `${gender1} != ${gender2}`,
          title: gender1 === gender2 ? 'not a match' : `are you bruce/caitlyn jenner?`,
          text: null,
          type: 'error',
          confirmButtonText: 'lol'
        };
      }
      this.swal.options = swalOptions;
      this.swal.show();
    }, _ => {
      this.comparing = false;
      const swalOptions: SweetAlertOptions = {
        title: 'fatal error occured, try again',
        text: null,
        type: 'error',
        confirmButtonText: 'grrr'
      };
      this.swal.options = swalOptions;
      this.swal.show();
    });
  }

  faceDetect(file: File) {
    const httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/octet-stream',
        'Ocp-Apim-Subscription-Key': environment.facedetectionapikey
      })
    };
    return this.http
      .post(`https://westus.api.cognitive.microsoft.com/face/v1.0/detect?
      returnFaceId=true&returnFaceLandmarks=false&returnFaceAttributes=gender`,
        file, httpOptions) as Observable<Array<IFaceDetectRes>>;
  }

}
