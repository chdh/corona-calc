import * as DataSource from "./DataSource";
import * as Chart from "./Chart";
import * as Gui from "./Gui";

async function startup3() {
   await DataSource.init();
   Chart.init();
   Gui.init(); }

async function startup2() {
   try {
      await startup3(); }
    catch (e) {
      console.log(e);
      alert(e); }}

function startup() {
   void startup2(); }

document.addEventListener("DOMContentLoaded", startup);
