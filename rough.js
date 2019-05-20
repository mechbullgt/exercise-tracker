// let r = Math.random().toString(36).substring(2,11);
// console.log("random", r);

let date = Date.now();
console.log('date :', date);
console.log(Date.parse(date));

let date2 = '2019-05-29';
let newDate = new Date(date2);
console.log('newDate :', newDate);
let newDate2 = Date.parse(newDate);
console.log('newDate2 :', newDate2);