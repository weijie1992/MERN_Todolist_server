const p = new Promise((resolve, reject) => {
  let a = 1 + 2;
  if (a === 2) {
    resolve("Success!");
  } else {
    reject("Failed!");
  }
});

p.then((success) => console.log(success)).catch((fail) => console.log(fail));

const p2 = () => {
  return new Promise((resolve, reject) => {
    let a = 1 + 2;
    if (a === 2) {
      resolve("Success!");
    } else {
      reject("Failed!");
    }
  });
};

p2()
  .then((s) => console.log(s))
  .catch((f) => console.log(f));
