import { Component, OnInit, ViewChild } from '@angular/core';
import { Location } from '@angular/common'
import { Router } from "@angular/router";
import { TranslateService } from '@ngx-translate/core';
import { AlertController } from '@ionic/angular';

import { LocalNotifications } from '@capacitor/local-notifications';

import { GlobalService } from "../global.service";

// PAGE:

@Component({
  selector: 'app-logout',
  templateUrl: './logout.page.html',
  styleUrls: ['./logout.page.scss'],
})
export class LogoutPage implements OnInit {

  // LIFECYCLE:

  constructor(      
      private location: Location,
      private router: Router,
      public alertCtrl: AlertController,
      public translate: TranslateService,
      public G: GlobalService) { 
    this.G.L.entry("LogoutPage.constructor");
  }

  ngOnInit() {
    this.G.L.entry("LogoutPage.ngOnInit");
  }
  
  ionViewWillEnter() {
    this.G.L.entry("LogoutPage.ionViewWillEnter");
    this.G.D.save_state();
  }

  ionViewDidEnter() {
    this.G.L.entry("LogoutPage.ionViewDidEnter");
    // TODO: query whether really logout:
    if (this.G.D.ready) {
      this.confirm_dialog();
    }
  }

  onDataReady() {
    // called when DataService initialization was slower than view initialization
    this.G.L.entry("LogoutPage.onDataReady");
  }

  ionViewDidLeave() {
    this.G.L.entry("LogoutPage.ionViewDidLeave");
  }

  async confirm_dialog() {
    const dialog = await this.alertCtrl.create({ 
      header: this.translate.instant('logout.confirm-header'), 
      message: this.translate.instant('logout.confirm-intro'), 
      buttons: [
        { 
          text: this.translate.instant('cancel'), 
          role: 'cancel',
          handler: () => { 
            this.G.L.trace('LogoutPage.confirm_dialog cancel');
            // TODO: navigate back
            this.location.back();
          } 
        },
        { 
          text: this.translate.instant('logout.confirm-button'),
          role: 'ok', 
          handler: () => {
            this.G.L.trace('LogoutPage.confirm_dialog logout');
            // clear all local storage:
            this.G.D.clear_all_local().then(() => {
              // now reload page, which will reinit the app and redirect us to the login page
              // (at least in browsers – what about native apps?):
              LocalNotifications.schedule({ notifications: [{ id: null,
                title: "Reloading...",
                body: null
              }]});
              window.location.reload();
            }).catch(error => {
              LocalNotifications.schedule({ notifications: [{ id: null,
                  title: this.translate.instant("logout.failed"),
                  body: null
              }]});
              // go back to previous page:
              this.location.back();
            })
          } 
        } 
      ] 
    }); 
    await dialog.present(); 
  }

}
