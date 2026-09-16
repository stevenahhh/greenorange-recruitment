window.recruitmentApi = (request) => new Promise((resolve, reject) => {
  google.script.run
    .withSuccessHandler(resolve)
    .withFailureHandler(reject)
    .dispatch(request);
});
