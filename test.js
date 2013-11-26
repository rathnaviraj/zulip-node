var run = function() {
  setTimeout(function() {
    console.log('hello');
    run();
  }, 1000);
};

run();
