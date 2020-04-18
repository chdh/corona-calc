import * as DataSource from "./DataSource";
import * as Calc from "./Calc";
import * as Chart from "./Chart";
import * as Gui from "./Gui";

async function startup2() {
   await DataSource.init();
   Calc.init();
   Chart.init();
   Gui.init(); }

async function startup() {
   try {
      await startup2(); }
    catch (e) {
      console.log(e);
      alert(e); }}

document.addEventListener("DOMContentLoaded", startup);
