import { Component, OnInit, NgModule } from "@angular/core";
import {
  FormGroup,
  FormBuilder,
  FormControl,
  Validators,
} from "@angular/forms";
import { GlobalService } from "../global.service";
import { Poll } from "../poll";

@Component({
  selector: "app-newpoll",
  templateUrl: "./newpoll.page.html",
  styleUrls: ["./newpoll.page.scss"],
})
export class NewpollPage implements OnInit {
  public myForm: FormGroup;

  public optionCount: number = 1;

  constructor(private formBuilder: FormBuilder, public g: GlobalService) {
    this.myForm = formBuilder.group({
      option1: ["", Validators.required],
    });
  }

  ngOnInit() {}
  addControl() {
    this.optionCount++;
    this.myForm.addControl(
      "option" + this.optionCount,
      new FormControl("", Validators.required)
    );
  }
  removeControl(control) {
    this.myForm.removeControl(control.key);
    console.log(control.key.getElementById("oname").value);
  }
  generatePoll() {
    let rawpoll: string[][] = [
      [
        (document.getElementById("pid") as HTMLInputElement).value,
        (document.getElementById("ptitle") as HTMLInputElement).value,
        (document.getElementById("pdesc") as HTMLInputElement).value,
      ],
    ];
    for (let i = 1; i <= this.optionCount; i++) {
      rawpoll[i] = [
        (document.getElementById(`option${i}name`) as HTMLInputElement).value,
        (document.getElementById(`option${i}desc`) as HTMLInputElement).value,
      ];
    }

    let p = new Poll(this.g).setnewPoll(rawpoll);
    this.g.openpid = p.pid;
    this.g.polls[p.pid] = p;

    this.g.openpoll = this.g.polls[this.g.openpid];
  }
}
