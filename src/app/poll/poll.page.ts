import { Component, OnInit, NgZone, ViewChild, ElementRef } from '@angular/core';
import { Router, ActivatedRoute } from "@angular/router";
import { TranslateService } from '@ngx-translate/core';
import { LoadingController, IonContent } from '@ionic/angular';
import { PopoverController, AlertController } from '@ionic/angular'; 

import { GlobalService } from "../global.service";
import { Poll } from '../poll.service';

import { DelegationDialogPage } from '../delegation-dialog/delegation-dialog.module';  

@Component({
  selector: 'app-poll',
  templateUrl: './poll.page.html',
  styleUrls: ['./poll.page.scss'],
})
export class PollPage implements OnInit {

  Array = Array;
  Math = Math;
  Object = Object;

  @ViewChild(IonContent, { static: false }) content: IonContent;

  page = "previewpoll";

  pid: string;
  p: Poll;

  incoming_delegation_expanded = false;
  n_indirect_clients = 1;
  accepted_requests = [];
  declined_requests = [];

  oidsorted: string[] = [];
  sortingcounter: number = 0;

  approved = {}; // whether option is approved by me
  votedfor = null; // oid my prob. share goes to
  expanded = {};

  private pieradius = 20;
  private two_pi = 2*Math.PI; 
  slidercolor = {};

  refresh_paused = false;
  needs_refresh = false;

  scroll_position = 0;
  slidersAllowEvents = true; // TODO! false;
  rate_yourself_toggle: Record<string, boolean> = {};
  n_delegated = 0;

  // LIFECYCLE:

  ready = false;  

  constructor(
      private router: Router,
      private route: ActivatedRoute,
      public loadingController: LoadingController,
      public alertCtrl: AlertController,
      private popover: PopoverController,
      public translate: TranslateService,
      private zone: NgZone,
      public G: GlobalService) {
    /* this.events.subscribe('updateScreen', () => {
      this.zone.run(() => {
        console.log('force update the screen');
      });
    }); */
    this.G.L.entry("PollsPage.constructor");
    this.route.params.subscribe( params => { 
      this.pid = params['pid'];
    } );
  }

  ngOnInit() {
    this.G.L.entry("PollsPage.ngOnInit");
  }

  ionViewWillEnter() {
    this.G.L.entry("PollPage.ionViewWillEnter");
    this.G.D.page = this;
  }

  ionViewDidEnter() {
    this.G.L.entry("PollPage.ionViewDidEnter");
    if (this.G.D.ready) {
      this.onDataReady();
    }
    this.G.L.debug("PollPage.ready:", this.ready);
  }

  onDataReady() {
    // called when DataService initialization was slower than view initialization
    this.G.L.entry("PollPage.onDataReady");
    if (this.pid in this.G.P.polls) {
      this.p = this.G.P.polls[this.pid];
      if (this.p.state == 'draft') {
        this.G.L.error("PollPage not showing draft poll, redirecting to mypolls page", this.pid);
        this.router.navigate(["/mypolls"]);
      } else {
        this.G.L.info("PollPage showing poll", this.pid);
      }
      // TODO: check if running or closed!
    } else {
      this.G.L.warn("PollPage unknown pid ignored, redirecting to mypolls page", this.pid, this.G.P.polls);
      this.router.navigate(["/mypolls"]);
      return;
    }
    this.p.tally_all();
    // TODO: optimize sorting performance:
    this.oidsorted = [...this.p.T.oids_descending]; 
    this.ready = true;
    this.update_order();
    for (let oid of this.oidsorted) {
      this.expanded[oid] = false;
      this.rate_yourself_toggle[oid] = false;
    }
    this.on_delegate_toggle_change();
    window.setTimeout(this.show_stats.bind(this), 100);
    this.update_incoming();
    this.G.L.exit("PollPage.onDataReady");
  }

  onDataChange() {
    this.p.tally_all();
    this.update_order();
    this.update_incoming();
  }

  update_incoming() {
    // determine own weight:
    this.n_indirect_clients = this.p.get_n_indirect_clients(this.p.myvid);
    // find incoming delegations:
    const cache = this.G.D.incoming_dids_caches[this.pid];
    this.accepted_requests = [];
    this.declined_requests = [];
    if (cache) {
      for (let [did, [from, url, status]] of cache) {
        if (status == 'accepted') {
          this.accepted_requests.push({from:from, url:url});
        } else if (status.startsWith('declined')) {
          this.declined_requests.push({from:from, url:url});
        } 
      }
    }
  }

  ionViewWillLeave() {
    // make sure current slider values are really stored in database:
    for (let oid of this.oidsorted) {
      this.p.set_myrating(oid, Math.round(this.get_slider_value(oid)), true);
    }
  }

  ionViewDidLeave() {
    this.G.L.entry("PollPage.ionViewDidLeave");
    this.G.D.save_state();
    this.G.L.exit("PollPage.ionViewDidLeave");
  }

  async onScroll(ev) {
    const elem = this.content; //  document.getElementById("ion-content-id");
  
    // the ion content has its own associated scrollElement
    const scrollElement = await ( elem as any).getScrollElement();
  
    const scrollPosition = ev.detail.scrollTop;
    const totalContentHeight = scrollElement.scrollHeight;
    const viewportHeight = scrollElement.offsetHeight;
  
    this.scroll_position = scrollPosition / (totalContentHeight - viewportHeight);
    
  }
  scrollToBottom() {
    this.content.scrollToBottom(1000);
  }
  scrollToTop() {
    this.content.scrollToTop(1000);
  }

  on_rate_yourself_toggle_change(oid:string) {
    // update delegation data:
    this.G.Del.update_my_delegation(this.pid, oid, !this.rate_yourself_toggle[oid]);
    this.on_delegate_toggle_change();
  }

  on_delegate_toggle_change() {
    // update n_delegated: // TODO: make more efficient
    let sum = 0;
    for (let [oid, b] of Object.entries(this.rate_yourself_toggle)) {
      if (!b) sum++;
    }
    this.n_delegated = sum;
  }

  show_stats() { 
    // update pies and bars, but not order!
    let p = this.p, T = p.T, myvid = p.myvid, 
        approval_scores_map = T.approval_scores_map,
        shares_map = T.shares_map, approvals_map = T.approvals_map;
    this.votedfor = T.votes_map.get(this.p.myvid);
    for (let oid of p.oids) {
      // FIXME: bar and pie are sometimes null here, but not when running the getElementById in the console. why?
      let approval_score = approval_scores_map.get(oid),
          share = shares_map.get(oid),
          bar = <SVGRectElement><unknown>document.getElementById('bar_'+oid),
          pie = <SVGPathElement><unknown>document.getElementById('pie_'+oid),
          R = this.pieradius,
          dx = R * Math.sin(this.two_pi * share),
          dy = R * (1 - Math.cos(this.two_pi * share)),
          more_than_180_degrees_flag = share > 0.5 ? 1 : 0; 
      this.approved[oid] = approvals_map.get(oid).get(myvid);
      if (bar) {
        bar.width.baseVal.valueAsString = (100 * approval_score).toString() + '%';
        bar.x.baseVal.valueAsString = (100 * (1 - approval_score)).toString() + '%';
      } else {
        this.G.L.warn("PollPage.show_stats couldn't change slider bar", oid);
      }
      if (pie) {
        if (share < 1) {
          pie.setAttribute('d', "M 21,25 l 0,-"+R+" a "+R+" "+R+" 0 "+more_than_180_degrees_flag+" 1 "+dx+" "+dy+" Z");
        } else { // a full circle
          pie.setAttribute('d', "M 21,25 l 0,-20 a 20 20 0 1 1 0 "+(2*R)+" a 20 20 0 1 1 0 "+(-2*R)+" Z");
        }
      } else {
        this.G.L.warn("PollPage.show_stats couldn't change pie piece", oid);
      }
      this.set_slider_color(oid, p.get_myrating(oid));
    }
  }

  async update_order(force=false) {
    // TODO: rather have this triggered by tally function!
    for (let i in this.oidsorted) { // loops over the indices
      if (this.oidsorted[i] != this.p.T.oids_descending[i]) {
//        this.G.L.trace("PollPage.update_order", this.oidsorted[i], this.p.T.oids_descending[i]);
        this.needs_refresh = true;
        break;
      }
    }
    if (force || (this.needs_refresh && !(this.refresh_paused))) {
      // link displayed sorting to poll's sorting:
      const loadingElement = await this.loadingController.create({
        message: this.translate.instant('poll.sorting'),
        spinner: 'crescent',
        duration: 100
      });
      await loadingElement.present();
      await loadingElement.onDidDismiss();
      // now actually tell html to use the new ordering:
      this.oidsorted = [...this.p.T.oids_descending];
      this.sortingcounter++;
      this.needs_refresh = false;
    } 
  }

  set_slider_color(oid: string, value: number) {
    this.slidercolor[oid] = 
      (value == 0) ? 'vodlered' : 
      (value + this.p.T.approval_scores_map.get(oid) * 100 <= 100) ? 'vodleblue' : 
      (this.votedfor != oid) ? 'vodlegreen' : 
      'vodledarkgreen';
  }

  // controls:

  // TODO: remove these?
  pause_refresh() {
    this.refresh_paused = true;
  }

  unpause_refresh() {
    this.refresh_paused = false;
    this.update_order(true);
  }

  refresh_once() {
    this.update_order(true);
  }

  expand(oid: string) {
    this.expanded[oid] = !this.expanded[oid];
  }

  get_slider(oid: string) {
    return <HTMLInputElement>document.getElementById('slider_'+oid+"_"+this.sortingcounter);
  }

  set_slider_values() {
    for (let oid of this.p.oids) {
      this.get_slider(oid).value = this.p.effective_ratings_map.get(oid).get(this.p.myvid).toString();
    }
  }

  get_slider_value(oid: string) {
    return Number(this.get_slider(oid).value);
  }

  apply_sliders_rating(oid: string) {
    this.p.set_myrating(oid, Math.round(this.get_slider_value(oid)), false);
//    this.G.D.save_state();
    this.show_stats();
  }

  rating_change_begins(oid: string) {
  }

  rating_changes(oid: string) {
    var slider = this.get_slider(oid),
        value = Number(slider.value);
    this.set_slider_color(oid, value);
    this.apply_sliders_rating(oid);
  }

  rating_change_ended(oid: string) {
    // TODO: make sure this is really always called right after releasing the slider!
    this.G.L.trace("PollPage.rating_change_ended");
    this.update_order();
    this.p.set_myrating(oid, Math.round(this.get_slider_value(oid)), true);
    this.G.D.save_state();
  }

  dragged_oid: string = undefined;

  // The following three handlers prevent the slider from responding when pointer is not on knob:
  
  onRangePointerdown(oid:string, ev:PointerEvent) {
    this.dragged_oid = oid;
    const pos = this.get_knob_pos(oid), x = ev.clientX;
    this.G.L.entry("onRangePointerdown", oid, x, pos);
    if ((x < pos.left) || (x > pos.right)) {
      this.swallow_event(ev);
    }
  }

  onRangePointerup(oid:string, ev:PointerEvent) {
    // FIXME: not always firing on Android if click is too short
    this.G.L.entry("onRangePointerup", oid, this.dragged_oid);
    if (oid != this.dragged_oid) {
      this.swallow_event(ev);
    } else {
      this.rating_change_ended(oid);
    }
    this.dragged_oid = null;
  }

  onRangeClick(oid:string, ev:MouseEvent) {
    const pos = this.get_knob_pos(oid), x = ev.clientX;
    this.G.L.entry("onRangeClick", oid, x, pos);
    if ((x < pos.left) || (x > pos.right)) {
      this.swallow_event(ev);
    }
  }

  onBodyPointerup(ev:PointerEvent) {
    if (this.dragged_oid) {
      this.G.L.entry("onBodyPointerup");
      this.onRangePointerup(this.dragged_oid, ev);
    }
  }

  get_knob_pos(oid: string){
    const slider = this.get_slider(oid), 
          slider_rect = this.get_screen_coords(slider),
          value = this.get_slider_value(oid),
          knob_center_x = slider_rect.left + (slider_rect.right - slider_rect.left) * value / 100;
    this.G.L.trace("pointer slider value", value);
    return {left: knob_center_x - 20, right: knob_center_x + 20}
  }

  get_screen_coords(element: HTMLElement) {
    return element.getBoundingClientRect();
  }

  swallow_event(ev: Event) {
    // FIXME: does not work in Android app yet!
    ev.stopPropagation();
    ev.preventDefault();
  }

  // only here for debugging purposes:
  close_poll() {
    if (confirm("really close the poll?")) {
//      this.p.close();
//      this.router.navigate(["/closedpoll"]);
    }
  }

  delegate_dialog() {
    this.popover.create({
        component: DelegationDialogPage, 
        translucent: true,
        showBackdrop: true,
//        align: "center",
//        cssClass: 'kebap',
        componentProps: {parent: this}
      })
      .then((popoverElement)=>{
        popoverElement.present();
      })
  }

/*
  async OLD_delegate_dialog(nickname=null, invalid=false) { 
    const dialog = await this.alertCtrl.create({ 
      header: this.translate.instant('poll.delegate-header'), 
      message: 
        this.translate.instant('poll.delegate-intro1') + "<br/><br/><b>" + 
        (invalid 
          ? '<i><span style="color:red!important">' + this.translate.instant('poll.delegate-intro2invalid') + '</span></i>'
          // FIXME: won't render red for some reason...
          : this.translate.instant('poll.delegate-intro2')
        )
        + "</b>", 
      inputs: [
        {
          name: 'nickname',
          placeholder: this.translate.instant('poll.delegate-nickname'),
          type: 'text',
          value: nickname
        }
      ],
      buttons: [
        { 
          text: this.translate.instant('cancel'), 
          role: 'cancel',
          handler: () => { 
            this.G.L.debug('delegate_dialog cancelled.');
          } 
        },
        { 
          text: this.translate.instant('poll.request-delegation'),
          role: 'ok', 
          handler: data => {
            const valid = data.nickname != ''; // this.G.D.email_is_valid(data.email);
            this.G.L.debug('delegate_dialog OK.', data.nickname, valid);
            if (!valid) {
              this.delegate_dialog(null, true);
            } else {
              this.delegation_request_dialog(data.nickname);
            }
          } 
        } 
      ] 
    }); 
    await dialog.present(); 
  } 
*/

  add_option() {
    // TODO: also add delegation if ospec.type == "-"
  }
}
