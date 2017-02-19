function Cat() {
  this.myMeow = 'Mrrow';

  this.scratch = function() {
    console.log('Scritchey-scratch.');
  }
}

Cat.prototype.meow = function() {
  console.log(this.myMeow);
}

Cat.prototype.jump = function() {
  console.log('The cat jumped and said ' + this.myMeow + '!');
}

function test(fn) {
  fn();
}

function callPrototype(fn, context) {
  fn.call(context);
}

var myCat = new Cat();

test(myCat.scratch);
test(myCat.meow);
test(myCat.jump);
test(Cat.prototype.jump);
callPrototype(Cat.prototype.jump, myCat);

Cat.prototype.jump.call(myCat);

