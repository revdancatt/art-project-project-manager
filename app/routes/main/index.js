exports.index = async (req, res) => {
  return res.render('main/index', req.templateValues)
}
