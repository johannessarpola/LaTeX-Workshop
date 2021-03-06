import * as vscode from 'vscode'

import {Extension} from './main'

export class Commander {
    extension: Extension
    commandTitles: string[]
    commands: string[]

    constructor(extension: Extension) {
        this.extension = extension
    }

    async build(skipSelection: boolean = false, recipe: string | undefined = undefined) {
        this.extension.logger.addLogMessage(`BUILD command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        const rootFile = await this.extension.manager.findRoot()

        if (rootFile === undefined) {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root file.`)
            return
        }
        if (skipSelection) {
            this.extension.logger.addLogMessage(`Building root file: ${rootFile}`)
            this.extension.builder.build(rootFile, recipe)
        } else {
            const subFileRoot = this.extension.manager.findSubFiles()
            if (subFileRoot) {
                vscode.window.showQuickPick([{
                    label: 'Default root file',
                    description: `Path: ${rootFile}`
                }, {
                    label: 'Subfiles package root file',
                    description: `Path: ${subFileRoot}`
                }], {
                    placeHolder: 'Subfiles package detected. Which file to build?',
                    matchOnDescription: true
                }).then(selected => {
                    if (!selected) {
                        return
                    }
                    switch (selected.label) {
                        case 'Default root file':
                            this.extension.logger.addLogMessage(`Building root file: ${rootFile}`)
                            this.extension.builder.build(rootFile, recipe)
                            break
                        case 'Subfiles package root file':
                            this.extension.logger.addLogMessage(`Building root file: ${subFileRoot}`)
                            this.extension.builder.build(subFileRoot, recipe)
                            break
                        default:
                            break
                    }
                })
            } else {
                this.extension.logger.addLogMessage(`Building root file: ${rootFile}`)
                this.extension.builder.build(rootFile, recipe)
            }
        }
    }

    recipes(recipe?: string) {
        this.extension.logger.addLogMessage(`RECIPES command invoked.`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        const recipes = configuration.get('latex.recipes') as {name: string}[]
        if (!recipes) {
            return
        }
        if (recipe) {
            this.build(false, recipe)
            return
        }
        vscode.window.showQuickPick(recipes.map(candidate => candidate.name), {
            placeHolder: 'Please Select a LaTeX Recipe'
        }).then(selected => {
            if (!selected) {
                return
            }
            this.build(false, selected)
        })
    }

    async view(mode?: string) {
        this.extension.logger.addLogMessage(`VIEW command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        const rootFile = await this.extension.manager.findRoot()
        if (rootFile === undefined) {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root PDF to view.`)
            return
        }
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (mode === 'browser') {
            this.extension.viewer.openViewer(rootFile)
            return
        } else if (mode === 'tab') {
            this.extension.viewer.openTab(rootFile)
            return
        } else if (mode === 'set') {
            this.setViewer()
            return
        }
        const promise = (configuration.get('view.pdf.viewer') as string === 'none') ? this.setViewer() : Promise.resolve()
        promise.then(() => {
            switch (configuration.get('view.pdf.viewer')) {
                case 'browser':
                    this.extension.viewer.openViewer(rootFile)
                    break
                case 'tab':
                default:
                    this.extension.viewer.openTab(rootFile)
                    break
                case 'external':
                    this.extension.viewer.openExternal(rootFile)
                    break
            }
        })
    }

    kill() {
        this.extension.logger.addLogMessage(`KILL command invoked.`)
        this.extension.builder.kill()
    }

    async browser() {
        this.extension.logger.addLogMessage(`BROWSER command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        const rootFile = await this.extension.manager.findRoot()
        if (rootFile !== undefined) {
            this.extension.viewer.openViewer(rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root PDF to view.`)
        }
    }

    async tab() {
        this.extension.logger.addLogMessage(`TAB command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        const rootFile = await this.extension.manager.findRoot()
        if (rootFile !== undefined) {
            this.extension.viewer.openTab(rootFile)
        } else {
            this.extension.logger.addLogMessage(`Cannot find LaTeX root PDF to view.`)
        }
    }

    pdf(uri: vscode.Uri | undefined) {
        this.extension.logger.addLogMessage(`PDF command invoked.`)
        if (uri === undefined || !uri.fsPath.endsWith('.pdf')) {
            return
        }
        console.log(uri)
        this.extension.viewer.openTab(uri.fsPath, false)
    }

    async synctex() {
        this.extension.logger.addLogMessage(`SYNCTEX command invoked.`)
        await this.extension.manager.findRoot()
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.locator.syncTeX()
    }

    async clean() : Promise<void> {
        this.extension.logger.addLogMessage(`CLEAN command invoked.`)
        await this.extension.manager.findRoot()
        return this.extension.cleaner.clean()
    }

    addTexRoot() {
        this.extension.logger.addLogMessage(`ADDTEXROOT command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.texMagician.addTexRoot()
    }

    citation() {
        this.extension.logger.addLogMessage(`CITATION command invoked.`)
        this.extension.completer.citation.browser()
    }

    wordcount() {
        this.extension.logger.addLogMessage(`WORDCOUNT command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId) ||
            this.extension.manager.rootFile === vscode.window.activeTextEditor.document.fileName) {
            this.extension.counter.count(this.extension.manager.rootFile)
        } else {
            this.extension.counter.count(vscode.window.activeTextEditor.document.fileName, false)
        }
    }

    log(compiler?) {
        this.extension.logger.addLogMessage(`LOG command invoked.`)
        if (compiler) {
            this.extension.logger.showCompilerLog()
            return
        }
        this.extension.logger.showLog()
    }

    gotoSection(filePath: string, lineNumber: number) {
        this.extension.logger.addLogMessage(`GOTOSECTION command invoked. Target ${filePath}, line ${lineNumber}`)

        vscode.workspace.openTextDocument(filePath).then((doc) => {
            vscode.window.showTextDocument(doc).then((_) => {
                //editor.selection = new vscode.Selection(new vscode.Position(lineNumber,0), new vscode.Position(lineNumber,0))
                vscode.commands.executeCommand('revealLine', {lineNumber, at: 'center'})
            })
        })

    }

    setViewer() {
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        return vscode.window.showQuickPick(['VSCode tab', 'Web browser'], {placeHolder: `View PDF with`})
        .then(option => {
            switch (option) {
                case 'Web browser':
                    configuration.update('view.pdf.viewer', 'browser', true)
                    vscode.window.showInformationMessage(`By default, PDF will be viewed with web browser. This setting can be changed at "latex-workshop.view.pdf.viewer".`)
                    break
                case 'VSCode tab':
                    configuration.update('view.pdf.viewer', 'tab', true)
                    vscode.window.showInformationMessage(`By default, PDF will be viewed with VSCode tab. This setting can be changed at "latex-workshop.view.pdf.viewer".`)
                    break
                default:
                    break
            }
        })
    }

    navigateToEnvPair() {
        this.extension.logger.addLogMessage(`JumpToEnvPair command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.gotoPair()
    }

    selectEnvName() {
        this.extension.logger.addLogMessage(`SelectEnvName command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.selectEnvName('selection')
    }

    multiCursorEnvName() {
        this.extension.logger.addLogMessage(`MutliCursorEnvName command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.selectEnvName('cursor')
    }

    closeEnv() {
        this.extension.logger.addLogMessage(`CloseEnv command invoked.`)
        if (!vscode.window.activeTextEditor || !this.extension.manager.hasTexId(vscode.window.activeTextEditor.document.languageId)) {
            return
        }
        this.extension.envPair.closeEnv()
    }

    actions() {
        this.extension.logger.addLogMessage(`ACTIONS command invoked.`)
        const configuration = vscode.workspace.getConfiguration('latex-workshop')
        if (!this.commandTitles) {
            const commands = this.extension.packageInfo.contributes.commands.filter(command => {
                if (command.command.indexOf('latex-workshop-dev') > -1) {
                    return 0
                }
                return ['latex-workshop.actions', 'latex-workshop.build', 'latex-workshop.recipes',
                        'latex-workshop.view', 'latex-workshop.compilerlog',
                        'latex-workshop.log', 'latex-workshop.tab'].indexOf(command.command) < 0
            })
            this.commandTitles = commands.map(command => command.title)
            this.commands = commands.map(command => command.command)
        }
        vscode.window.showQuickPick(['Build LaTeX project', 'View LaTeX PDF', 'View log messages',
                                     'Miscellaneous LaTeX functions', 'Create an issue on Github',
                                     'Star the project']).then(selected => {
            if (!selected) {
                return
            }
            switch (selected) {
                case 'Build LaTeX project':
                    this.recipes()
                    break
                case 'View LaTeX PDF':
                    const options: string[] = []
                    if (configuration.get('view.pdf.viewer') !== 'none') {
                        options.push('View in default viewer')
                    }
                    vscode.window.showQuickPick([...options, 'Set default viewer', 'View in web browser', 'View in VS Code tab']).then(viewer => {
                        switch (viewer) {
                            case 'View in default viewer':
                                this.view()
                                break
                            case 'Set default viewer':
                            default:
                                this.setViewer()
                                break
                            case 'View in web browser':
                                this.browser()
                                break
                            case 'View in VS Code tab':
                                this.tab()
                                break
                        }
                    })
                    break
                case 'View log messages':
                    vscode.window.showQuickPick(['View LaTeX compiler log messages',
                                                 'View LaTeX-Workshop extension messages',
                                                 'View LaTeX-Workshop extension change log']).then(option => {
                        switch (option) {
                            case 'View LaTeX compiler log messages':
                            default:
                                this.log(true)
                                break
                            case 'View LaTeX-Workshop extension messages':
                                this.log()
                                break
                            case 'View LaTeX-Workshop extension change log':
                                vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                                    'https://github.com/James-Yu/LaTeX-Workshop/blob/master/CHANGELOG.md'))
                                break
                        }
                    })
                    break
                case 'Miscellaneous LaTeX functions':
                    vscode.window.showQuickPick(this.commandTitles).then(option => {
                        if (option === undefined) {
                            return
                        }
                        vscode.commands.executeCommand(this.commands[this.commandTitles.indexOf(option)])
                    })
                    break
                case 'Create an issue on Github':
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                        'https://github.com/James-Yu/LaTeX-Workshop/issues/new'))
                    break
                case 'Star the project':
                    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(
                        'https://github.com/James-Yu/LaTeX-Workshop'))
                    break
                default:
                    const command = this.commands[this.commandTitles.indexOf(selected)]
                    vscode.commands.executeCommand(command)
                    break
            }
        })
    }

    /**
     * If the current line starts with \item or \item[], do the same for
     * the new line when hitting enter.
     * Note that hitting enter on a line containing only \item or \item[]
     * actually deletes the content of the line.
     */
    onEnterKey(modifiers?: string) {
        const editor = vscode.window.activeTextEditor
        if (!editor) {
            return
        }
        if (modifiers === 'alt') {
            return vscode.commands.executeCommand('editor.action.insertLineAfter')
        }

        const cursorPos = editor.selection.active
        const line = editor.document.lineAt(cursorPos.line)

        // if the line only constists of \item or \item[], delete its content
        if (/^\s*\\item(\[\s*\])?\s*$/.exec(line.text)) {
            const rangeToDelete = line.range.with(cursorPos.with(line.lineNumber, line.firstNonWhitespaceCharacterIndex), line.range.end)

            return editor.edit(editBuilder => {
                editBuilder.delete(rangeToDelete)
            })
        }

        const matches = /^(\s*)\\item(\[[^\[\]]*\])?\s*(.*)$/.exec(line.text)
        if (matches) {
            let itemString = ''
            let newCursorPos
            // leading indent
            if (matches[1]) {
                itemString  += matches[1]
            }
            // is there an optional paramter to \item
            if (matches[2]) {
                itemString += '\\item[] '
                newCursorPos = cursorPos.with(line.lineNumber + 1, itemString.length - 2)
            } else {
                itemString += '\\item '
                newCursorPos = cursorPos.with(line.lineNumber + 1, itemString.length)
            }
            return editor.edit(editBuilder => {
                // editBuilder.insert(cursorPos.with(line.lineNumber + 1, 0), `${itemString}\n`)
                editBuilder.insert(cursorPos.with(line.lineNumber + 1, 0), itemString + '\n')
                }).then(() => {
                    editor.selection = new vscode.Selection(newCursorPos, newCursorPos)
                }
            ).then(() => { editor.revealRange(editor.selection) })
        }
        return editor.edit(editBuilder => {
            editBuilder.insert(cursorPos, editor.document.eol === 1 ? '\n' : '\r\n')
        })//vscode.commands.executeCommand('editor.action.insertLineAfter')
    }

    devParseLog() {
        if (vscode.window.activeTextEditor === undefined) {
            return
        }
        this.extension.parser.parse(vscode.window.activeTextEditor.document.getText())
    }
}
