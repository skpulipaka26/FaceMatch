import { Component, ViewChild, ElementRef, OnInit } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import { Observable, forkJoin, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';

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
  @ViewChild('swalRef') private swal: SwalComponent;
  @ViewChild('videoElement') videoElement: ElementRef;

  constructor(private http: HttpClient) { }

  ngOnInit() {
  }

  onCapture() {
    const videoRef = this.videoElement.nativeElement as HTMLVideoElement;
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ video: true })
        .then(function (stream) {
          videoRef.srcObject = stream;
        })
        .catch(function (err0r) {
          console.log('Something went wrong!');
        });
    }
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
    forkJoin(faceDetect1$, faceDetect2$).pipe(
      switchMap(res => {
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
          type: 'success'
        };
      } else {
        swalOptions = {
          title: `not a match`,
          text: null,
          type: 'error'
        };
      }
      this.swal.options = swalOptions;
      this.swal.show();
    }, _ => {
      this.comparing = false;
      const swalOptions: SweetAlertOptions = {
        title: 'fatal error occured, try again',
        text: null,
        type: 'error'
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
      .post('https://westus.api.cognitive.microsoft.com/face/v1.0/detect?returnFaceId=true&returnFaceLandmarks=false',
        file, httpOptions) as Observable<Array<IFaceDetectRes>>;
  }

}
