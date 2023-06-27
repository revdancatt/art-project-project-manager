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
  // Turn all the keys into an array, sorted alphabetically
  const projectNames = Object.keys(projectsJSON).sort()
  // Add the project names to the template values
  req.templateValues.projectNames = projectNames

  return res.render('projects/index', req.templateValues)
}
