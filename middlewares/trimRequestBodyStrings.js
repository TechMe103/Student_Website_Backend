const trimRequestBodyStrings = (req, res, next) => {
  const trimStrings = (obj) => {
    for (const key in obj) {
      if (typeof obj[key] === "string") {
        obj[key] = obj[key].trim();
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        trimStrings(obj[key]);
      }
    }
  };

  trimStrings(req.body);
  next();
};

module.exports = trimRequestBodyStrings;
