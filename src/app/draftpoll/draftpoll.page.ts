import { Component, OnInit, ViewChild } from '@angular/core';
import { Validators, FormBuilder, FormGroup, FormControl, ValidationErrors, AbstractControl } from '@angular/forms';
import { PopoverController, IonSelect } from '@ionic/angular';

import { DraftpollKebapPage } from '../draftpoll-kebap/draftpoll-kebap.module';  

const urlRegex = /^(?:http(s)?:\/\/)?[\w.-]+(?:\.[\w\.-]+)+[\w\-\._~:/?#[\]@!\$&'\(\)\*\+,;=.]+$/;

@Component({
  selector: 'app-draftpoll',
  templateUrl: './draftpoll.page.html',
  styleUrls: ['./draftpoll.page.scss'],
})
export class DraftpollPage implements OnInit {

  max = Math.max;
  formGroup: FormGroup;
  stage: number
  option_stage: number;
  expanded: Array<boolean>;
  advanced_expanded: boolean;
  n_options: number;
  @ViewChild(IonSelect) type_select: IonSelect;

  constructor(public formBuilder: FormBuilder, private popover: PopoverController) { }

  ngOnInit() {
    this.n_options = 1;
    this.formGroup = this.formBuilder.group({
      poll_type: new FormControl('', Validators.required),
      poll_title: new FormControl('', Validators.required),
      poll_descr: new FormControl(''),
      poll_url: new FormControl('', Validators.pattern(urlRegex)),
      poll_closing_datetime: new FormControl(''), // TODO: validate is in future
      option_name0: new FormControl('', Validators.required),
      option_descr0: new FormControl(''),
      option_url0: new FormControl('', Validators.pattern(urlRegex)),
    });
    this.stage = 0;
    this.option_stage = 0;
    this.expanded = Array<boolean>(this.n_options);
    this.advanced_expanded = false;
  }

  ionViewWillEnter() {
    if (this.formGroup.get('poll_type').value=='') this.type_select.open()
  }

  test_url(url: string) {
    if (!url.startsWith("http")) url = "http://" + url; // TODO: improve this logic
    window.open(url,'_blank');
  }

  blur_option_url(i: number) {
    if (this.formGroup.get('option_url'+i).valid && i==this.n_options-1) {
      this.option_stage = this.max(this.option_stage, 3);
      this.expanded[i] = false
      this.add_option();
    }
  }

  del_option(i: number) {
    if (confirm("Delete " + (this.formGroup.get('poll_type').value=='choice' ? 'option' : 'target') 
          + " ‘" + this.formGroup.get('option_name'+i).value + "’")) {
      // move metadata of options i+1,i+2,... back one slot to i,i+1,..., then decrease n_options:
      for (let j=i+1; j<this.n_options; j++) {
        this.formGroup.get('option_name'+(j-1)).setValue(this.formGroup.get('option_name'+j).value); 
        this.formGroup.get('option_descr'+(j-1)).setValue(this.formGroup.get('option_descr'+j).value); 
        this.formGroup.get('option_url'+(j-1)).setValue(this.formGroup.get('option_url'+j).value); 
      }
      this.n_options--;
    }
  }

  no_more() {
    this.n_options--;
    this.option_stage = 10;
    this.formGroup.removeControl('option_name'+this.n_options);
    this.formGroup.removeControl('option_descr'+this.n_options);
    this.formGroup.removeControl('option_url'+this.n_options);
  }

  add_option() {
    let i = this.n_options;
    this.formGroup.addControl('option_name'+i, new FormControl('', Validators.required));
    this.formGroup.addControl('option_descr'+i, new FormControl(''));
    this.formGroup.addControl('option_url'+i, new FormControl('', Validators.pattern(urlRegex)));
    this.option_stage = 0;
    this.n_options++;
  }

  validation_messages = {
    'poll_type': [
      { type: 'required', message: 'Please select.' },
    ],
    'poll_title': [
      { type: 'required', message: 'Poll title is required.' },
    ],
    'poll_url': [
      { type: 'pattern', message: 'Please enter a valid URL.' },
    ],
    'option_name0': [
      { type: 'required', message: 'Option name is required.' },
    ],
    'option_url0': [
      { type: 'pattern', message: 'Please enter a valid URL.' },
    ],
  }

  showkebap(event)
  {
    this.popover.create({
        event, 
        component: DraftpollKebapPage, 
        translucent: true,
        showBackdrop: false,
        cssClass: 'kebap',
        componentProps: {parent: this}
      })
      .then((popoverElement)=>{
        popoverElement.present();
      })
  }

  send4review() { 
    console.log("2"); 
  }
  import() { 
    console.log("2"); 
  }
}
