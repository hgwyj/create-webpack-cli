import chalk from "chalk";//chalk for colored output
import ncp from "ncp";//This library supports recursive copying cross-platform and even has a flag to force override existing files.
import path from "path"; // node origin method
import fs from "fs"; // node origin method
import {promisify} from "util"; // use promisify return promise function
import execa from 'execa';//which allows us to easily run external commands like git
import Listr from 'listr'; //which let's us specify a list of tasks and gives the user a neat progress overview
import {projectInstall} from 'pkg-install';//to trigger either yarn install or npm install depending on what the user uses

const access = promisify(fs.access); //fs.access test user permission api
const copy = promisify(ncp);

async function copyTemplateFiles(options) {
    return copy(options.templateDirectory,
        options.targetDirectory, {
            clobber: false, //if set false will not overwrite destination if exits
        });
};

async function initGit(options) {
    const result = await execa('git', ['init'], {
        cwd: options.targetDirectory,
    });
    if (result.failed) {
        return Promise.reject(new Error('Failed to initialize git'));
    }
    return;
};

export async function createProject(options) {
    options = {
        ...options,
        targetDirectory: options.targetDirectory || process.cwd(),
    };
    const currentFileUrl = import.meta.url;
    const templateDir = path.resolve(
        new URL(currentFileUrl).pathname,
        "../../templates",
        options.template.toLowerCase()
    );
    console.log("currentFileUrl", templateDir, currentFileUrl, options.targetDirectory);
    options.templateDirectory = templateDir;
    try {
        //fs.createConstantSource Check if the file is readable.
        await access(templateDir, fs.constants.R_OK);
    } catch (err) {
        console.error('%s Invalid template name', chalk.red.bold('ERROR'));
        process.exit(1);
    }
    ;
    const tasks = new Listr([
        {
            title: 'Copy project files',
            task: () => copyTemplateFiles(options),
        },
        {
            title: 'Initialize git',
            task: () => initGit(options),
            enabled: () => options.git,
        },
        {
            title: 'Install dependencies',
            task: () =>
                projectInstall({
                    cwd: options.targetDirectory,
                }),
            skip: () =>
                !options.runInstall
                    ? 'Pass --install to automatically install dependencies'
                    : undefined,
        },
    ]);
    await tasks.run();
    console.log('%s Project ready', chalk.green.bold('DONE'));
    return true;
};

