import { Component, OnInit, Input } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl, ValidationErrors, AbstractControl } from '@angular/forms';
import { PopoverController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';
import { LocalNotifications } from '@capacitor/local-notifications';

import { GlobalService } from "../global.service";
import { PollPage } from '../poll/poll.module';  
import { Poll } from '../poll.service';
import { del_agreement_t, del_request_t } from '../data.service';

@Component({
  selector: 'app-delegation-dialog',
  templateUrl: './delegation-dialog.page.html',
  styleUrls: ['./delegation-dialog.page.scss'],
})
export class DelegationDialogPage implements OnInit {

  @Input() parent: PollPage;

  ready = false;

  can_use_web_share: boolean;
  can_share: boolean;

  formGroup: FormGroup;

  p: Poll;
  did: string;
  request: del_request_t;
  private_key: string;
  agreement: del_agreement_t;
  delegation_link: string;
  message_title: string;
  message_body: string;
  mailto_url: string;

  constructor(
    private popover: PopoverController,
    public formBuilder: FormBuilder, 
    public translate: TranslateService,
    public G: GlobalService) { 
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
    this.can_use_web_share = (typeof navigator.share === "function");
    this.can_share = Capacitor.isNativePlatform() || this.can_use_web_share;
    this.formGroup = this.formBuilder.group({
      delegate_nickname: new FormControl('', Validators.required),
      from: new FormControl(this.G.S.email)
    });
    // TODO: what if already some delegation active or pending?
    // prepare a new delegation:
    [this.p, this.did, this.request, this.private_key, this.agreement] = this.G.Del.prepare_delegation(this.parent.pid);
    // TODO: make indentation in body work:
    this.message_title = this.translate.instant('delegation-request.message-subject', {due: this.G.D.format_date(this.p.due)});
    this.update_request();
    this.ready = true;
  }

  delegate_nickname_changed() {
    const delegate_nickname = this.formGroup.get('delegate_nickname').value;
    this.G.D.setp(this.p.pid, "del_nickname." + this.did, delegate_nickname);
    this.update_request();
  }

  from_changed() {
    const from = this.formGroup.get('from').value;
    this.G.D.setp(this.p.pid, "del_from." + this.did, from);
    this.set_delegation_link(from);
    this.update_request();
  }

  update_request() {
    this.G.L.entry("DelegationDialogPage.update_request");
    this.mailto_url = "mailto:" + encodeURIComponent(this.formGroup.get('delegate_nickname').value) + "?subject=" + encodeURIComponent(this.message_title) + "&body=" + encodeURIComponent(this.message_body); 
  }

  ClosePopover()
  {
    this.popover.dismiss();
  }

  validation_messages = {
    'delegate_nickname': [
      { type: 'required', message: 'validation.delegate_nickname-required' },
    ],
    'from': []
  }

  set_delegation_link(from: string) {
    this.delegation_link = this.G.Del.get_delegation_link(this.parent.pid, this.did, from, this.private_key);
    this.message_body = (this.translate.instant('delegation-request.message-body-greeting') + "\n\n" 
                + this.translate.instant('delegation-request.message-body-before-title') + "\n\n"
                + String.fromCharCode(160).repeat(4) + this.p.title + ".\n\n"
                + this.translate.instant('delegation-request.message-body-closes', {due: this.G.D.format_date(this.p.due)}) + "\n\n"
                + this.translate.instant('delegation-request.message-body-explanation') + "\n\n" 
                + this.translate.instant('delegation-request.message-body-before-link') + "\n\n" 
                + String.fromCharCode(160).repeat(4) + this.delegation_link + "\n\n"
                + this.translate.instant('delegation-request.message-body-dont-share') + "\n\n"
                + this.translate.instant('delegation-request.message-body-regards'));
  }

  share_button_clicked() {
    this.G.L.entry("DelegationDialogPage.share_button_clicked");
    this.delegate_nickname_changed();
    this.from_changed();
    Share.share({
      title: this.message_title,
      text: this.message_body,
      url: this.delegation_link,
      dialogTitle: 'Share vodle delegation link',
    }).then(res => {
      this.G.L.info("DelegationDialogPage.share_button_clicked succeeded", res);
      this.G.Del.after_request_was_sent(this.parent.pid, this.did, this.request, this.private_key, this.agreement);
      this.popover.dismiss();
    }).catch(err => {
      this.G.L.error("DelegationDialogPage.share_button_clicked failed", err);
    });
  }

  copy_button_clicked() {
    this.G.L.entry("DelegationDialogPage.copy_button_clicked");
    this.delegate_nickname_changed();
    this.from_changed();
    window.navigator.clipboard.writeText(this.delegation_link);
    this.G.Del.after_request_was_sent(this.parent.pid, this.did, this.request, this.private_key, this.agreement);
    LocalNotifications.schedule({
      notifications: [{
        title: this.translate.instant("delegation-request.notification-copied-link-title"),
        body: this.translate.instant("delegation-request.notification-copied-link-body", 
                                     {delegate_nickname: this.formGroup.get('delegate_nickname').value}),
        id: null
      }]
    })
    .then(res => {
      this.G.L.trace("DelegationDialogPage.copy_button_clicked localNotifications.schedule succeeded:", res);
    }).catch(err => {
      this.G.L.warn("DelegationDialogPage.copy_button_clicked localNotifications.schedule failed:", err);
    });
    this.parent.update_delegation_info();
    this.popover.dismiss();
    this.G.L.exit("DelegationDialogPage.copy_button_clicked");
  }

  email_button_clicked(ev: MouseEvent) {
    this.G.L.entry("DelegationDialogPage.email_button_clicked");
    this.delegate_nickname_changed();
    this.from_changed();
    this.G.Del.after_request_was_sent(this.parent.pid, this.did, this.request, this.private_key, this.agreement);
    this.parent.update_delegation_info();
    this.popover.dismiss();
    this.G.L.exit("DelegationDialogPage.email_button_clicked");
  }
}
