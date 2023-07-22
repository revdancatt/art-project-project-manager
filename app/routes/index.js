const express = require('express')
const router = express.Router()

const main = require('./main')
const project = require('./project')
const projects = require('./projects')

router.use(function (req, res, next) {
  req.templateValues = {}

  const d = new Date()
  req.templateValues.today = {
    day: d.getDate(),
    month: d.getMonth() + 1
  }
  res.header('Access-Control-Allow-Origin', '*') // update to match the domain you will make the request from
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
  next()
})

router.get('/', main.index)
router.post('/', main.index)
router.get('/projects', projects.index)
router.get('/project/:projectName', project.index)
router.post('/project/:projectName', project.index)
router.get('/project/:projectName/collage', project.collage)
router.post('/project/:projectName/collage', project.collage)

module.exports = router
