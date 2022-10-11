#!/usr/bin/env groovy

def installBuildRequirements(){
  def nodeHome = tool 'nodejs-lts'
  env.PATH="${env.PATH}:${nodeHome}/bin"
  sh "npm install --global yarn"
  sh "npm install --global vsce"
}

def buildVscodeExtension(){
  sh "yarn install"
  sh "yarn run vscode:prepublish"
}

node('rhel8'){

  stage 'Checkout vscode-yaml code'
  deleteDir()
  git branch: 'release', url: 'https://github.com/redhat-developer/vscode-yaml.git'

  stage 'install vscode-yaml build requirements'
  installBuildRequirements()

  stage 'Build vscode-yaml'
  sh "yarn install"
  sh "yarn run build"
  sh "yarn run check-dependencies"

  stage 'Test vscode-yaml for staging'
  wrap([$class: 'Xvnc']) {
    sh "yarn test --silent"
  }

  stage "Package vscode-yaml"
  def packageJson = readJSON file: 'package.json'
  sh "vsce package -o yaml-${packageJson.version}-${env.BUILD_NUMBER}.vsix"

  stage 'Upload vscode-yaml to staging'
  def vsix = findFiles(glob: '**.vsix')
  sh "sftp -C ${UPLOAD_LOCATION}/snapshots/vscode-yaml/ <<< \$'put -p \"${vsix[0].path}\"'"
  stash name:'vsix', includes:vsix[0].path
}

node('rhel8'){
  if(publishPreRelease.equals('true')){
    stage "publish generic version"
		withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
			sh 'vsce publish --pre-release -p ${TOKEN}'
		}

		stage "publish specific version"
		// for pre-release versions, vsixs are not stashed and kept in project folder
		withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
			def platformVsixes = findFiles(glob: '**.vsix')
			for(platformVsix in platformVsixes){
				sh 'vsce publish -p ${TOKEN}' + " --packagePath ${platformVsix.path}"
			}
		}
  } else if(publishToMarketPlace.equals('true')){
    timeout(time:5, unit:'DAYS') {
      input message:'Approve deployment?', submitter: 'yvydolob, msivasub'
    }

    stage "Publish to Marketplaces"
    unstash 'vsix';
    def vsix = findFiles(glob: '**.vsix')
    // VS Code Marketplace
    withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
      sh 'vsce publish -p ${TOKEN} --packagePath' + " ${vsix[0].path}"
    }

    // Open-vsx Marketplace
    sh "npm install -g ovsx"
    withCredentials([[$class: 'StringBinding', credentialsId: 'open-vsx-access-token', variable: 'OVSX_TOKEN']]) {
      sh 'ovsx publish -p ${OVSX_TOKEN}' + " ${vsix[0].path}"
    }
    archive includes:"**.vsix"

    stage ("Promote the build to stable") {
      vsix = findFiles(glob: '**.vsix')
      sh "sftp -C ${UPLOAD_LOCATION}/stable/vscode-yaml/ <<< \$'put -p \"${vsix[0].path}\"'"
    }
  }
}
