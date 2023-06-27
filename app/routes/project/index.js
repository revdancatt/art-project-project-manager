const fs = require('fs')
const path = require('path')

exports.index = async (req, res) => {
  // Set the data directory
  const dataDir = path.join(__dirname, '../../../data')
  // If it doesn't exist then redirect to the main page
  if (!fs.existsSync(dataDir)) return res.redirect('/')
  // Set the projects file
  const projectsFile = path.join(dataDir, 'projects.json')
  // If it doesn't exist then redirect to the main page
  if (!fs.existsSync(projectsFile)) return res.redirect('/')
  // Load the contents of the projects file
  const projectsJSON = JSON.parse(fs.readFileSync(projectsFile, 'utf-8'))
  // Check to see if the projectName doesn't exist in the projects file, if it doesn't then redirect to the main page
  if (!projectsJSON[req.params.projectName]) return res.redirect('/')
  // Load the project data into the template values
  const project = projectsJSON[req.params.projectName]
  // Add the project name to the project objects
  project.name = req.params.projectName
  // Add the project to the template values
  req.templateValues.project = project

  return res.render('project/index', req.templateValues)
}
