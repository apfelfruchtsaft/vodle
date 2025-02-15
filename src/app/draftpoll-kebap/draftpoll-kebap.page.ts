import { Component, OnInit, Input, ViewChild, ChangeDetectorRef } from '@angular/core';
import { PopoverController, IonSelect } from '@ionic/angular';
import { DraftpollPage } from '../draftpoll/draftpoll.module';  

@Component({
  selector: 'app-draftpoll-kebap',
  templateUrl: './draftpoll-kebap.page.html',
  styleUrls: ['./draftpoll-kebap.page.scss'],
})
export class DraftpollKebapPage implements OnInit {

  @Input() parent: DraftpollPage;

  @ViewChild(IonSelect, { static: false }) select_example: IonSelect;

  examples: string[];

  JSON = JSON;

  constructor(
    private popover: PopoverController,
    private ref: ChangeDetectorRef
  ) { 
    this.examples = [];
  }

  ngOnInit() {
  }

  ionViewWillEnter() {
  }

  ClosePopover()
  {
    this.popover.dismiss();
  }

  send4review() { 
    this.parent.send4review(); 
    this.popover.dismiss();
  }

  import() { 
    this.parent.import_csv_dialog(); 
    this.popover.dismiss();
  }

  use_example_clicked() {
    this.parent.G.D.get_example_docs().then(result => {
      this.examples = [];
      for (let row of result.rows) {
        let doc = row.doc;
        this.examples.push(JSON.stringify(doc));
      }
      // make sure the items appear in the select dialog:
      this.ref.detectChanges();
      this.select_example.open(new MouseEvent("click"));
    }).catch(err => {
      this.parent.G.L.error("DraftpollPage.use_example_clicked failed", err);
    });
  }

  use_example() { 
    var spec = this.select_example.value;
    if ((spec||'-')!='-') {
      this.parent.restart_with_data(spec); 
      this.popover.dismiss();
    }
  }

}
