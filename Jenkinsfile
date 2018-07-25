#!/usr/bin/env groovy

def installBuildRequirements(){
	def nodeHome = tool 'nodejs-7.7.4'
	env.PATH="${env.PATH}:${nodeHome}/bin"
	sh "npm install -g typescript@3.0.0-dev.20180626"
	sh "npm install -g vsce"
}

def buildVscodeExtension(){
	sh "npm install"
	sh "npm run vscode:prepublish"
}

node('rhel7'){

	stage 'Checkout vscode-yaml code'
	deleteDir()
	git url: 'https://github.com/redhat-developer/vscode-yaml.git'

	stage 'install vscode-yaml build requirements'
	installBuildRequirements()

	stage 'Build vscode-yaml'
	sh "npm install"
	sh "npm run vscode:prepublish"

	stage 'Test vscode-yaml for staging'
	wrap([$class: 'Xvnc']) {
		sh "npm test --silent"
	}

	stage "Package vscode-yaml"
	def packageJson = readJSON file: 'package.json'
	sh "vsce package -o yaml-${packageJson.version}-${env.BUILD_NUMBER}.vsix"

	stage 'Upload vscode-yaml to staging'
	def vsix = findFiles(glob: '**.vsix')
	sh "rsync -Pzrlt --rsh=ssh --protocol=28 ${vsix[0].path} ${UPLOAD_LOCATION}"
	stash name:'vsix', includes:vsix[0].path
}

node('rhel7'){
	timeout(time:5, unit:'DAYS') {
		input message:'Approve deployment?', submitter: 'jpinkney'
	}

	stage "Publish to Marketplace"
	unstash 'vsix';
	withCredentials([[$class: 'StringBinding', credentialsId: 'vscode_java_marketplace', variable: 'TOKEN']]) {
		def vsix = findFiles(glob: '**.vsix')
		sh 'vsce publish -p ${TOKEN} --packagePath' + " ${vsix[0].path}"
	}
	archive includes:"**.vsix"
}
