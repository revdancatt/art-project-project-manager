const fs = require('fs')
const path = require('path')

exports.index = async (req, res) => {
  // If a form has been posted here, process it
  if (req.method === 'POST') {
    // Check to see if we have 'projectName' in the body
    if (req.body.projectName) {
      let projectsJSON = {}
      // set the data directory
      const dataDir = path.join(__dirname, '../../../data')
      // If it doesn't exist, create it
      if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
      // set the projects file
      const projectsFile = path.join(dataDir, 'projects.json')
      // If it exists load the contents into projectsJSON
      if (fs.existsSync(projectsFile)) projectsJSON = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'))
      // If the name we have been given doesn't already exist, add it
      if (!projectsJSON[req.body.projectName]) {
        projectsJSON[req.body.projectName] = {}
        // Write the projectsJSON back to the file
        fs.writeFileSync(projectsFile, JSON.stringify(projectsJSON, null, 2))
      }
      // Redirect to the project page
      return res.redirect(`/project/${req.body.projectName}`)
    }
  }

  const dataDir = path.join(__dirname, '../../../data')
  const projectsFile = path.join(dataDir, 'projects.json')
  let projectNames = []
  if (fs.existsSync(projectsFile)) projectNames = Object.keys(JSON.parse(fs.readFileSync(projectsFile, 'utf-8'))).sort()
  req.templateValues.projectNames = projectNames
  return res.render('main/index', req.templateValues)
}
