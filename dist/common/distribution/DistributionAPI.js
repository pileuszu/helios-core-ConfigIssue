"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributionAPI = void 0;
const path_1 = require("path");
const got_1 = __importDefault(require("got"));
const LoggerUtil_1 = require("../../util/LoggerUtil");
const RestResponse_1 = require("../rest/RestResponse");
const fs_extra_1 = require("fs-extra");
const DistributionFactory_1 = require("./DistributionFactory");
// TODO Option to check endpoint for hash of distro for local compare
// Useful if distro is large (MBs)
class DistributionAPI {
    launcherDirectory;
    commonDir;
    instanceDir;
    remoteUrl;
    devMode;
    static log = LoggerUtil_1.LoggerUtil.getLogger('DistributionAPI');
    DISTRO_FILE = 'distribution.json';
    DISTRO_FILE_DEV = 'distribution_dev.json';
    distroPath;
    distroDevPath;
    distribution;
    rawDistribution;
    constructor(launcherDirectory, commonDir, instanceDir, remoteUrl, devMode) {
        this.launcherDirectory = launcherDirectory;
        this.commonDir = commonDir;
        this.instanceDir = instanceDir;
        this.remoteUrl = remoteUrl;
        this.devMode = devMode;
        this.distroPath = (0, path_1.resolve)(launcherDirectory, this.DISTRO_FILE);
        this.distroDevPath = (0, path_1.resolve)(launcherDirectory, this.DISTRO_FILE_DEV);
    }
    async getDistribution() {
        if (this.rawDistribution == null) {
            this.rawDistribution = await this.loadDistribution();
            this.distribution = new DistributionFactory_1.HeliosDistribution(this.rawDistribution, this.commonDir, this.instanceDir);
        }
        return this.distribution;
    }
    async getDistributionLocalLoadOnly() {
        if (this.rawDistribution == null) {
            const x = await this.pullLocal();
            if (x == null) {
                throw new Error('FATAL: Unable to load distribution from local disk.');
            }
            this.rawDistribution = x;
            this.distribution = new DistributionFactory_1.HeliosDistribution(this.rawDistribution, this.commonDir, this.instanceDir);
        }
        return this.distribution;
    }
    async refreshDistributionOrFallback() {
        const distro = await this._loadDistributionNullable();
        if (distro == null) {
            DistributionAPI.log.warn('Failed to refresh distribution, falling back to current load (if exists).');
            return this.distribution;
        }
        else {
            this.rawDistribution = distro;
            this.distribution = new DistributionFactory_1.HeliosDistribution(distro, this.commonDir, this.instanceDir);
            return this.distribution;
        }
    }
    toggleDevMode(dev) {
        this.devMode = dev;
    }
    isDevMode() {
        return this.devMode;
    }
    async loadDistribution() {
        const distro = await this._loadDistributionNullable();
        if (distro == null) {
            // TODO Bubble this up nicer
            throw new Error('FATAL: Unable to load distribution from remote server or local disk.');
        }
        return distro;
    }
    async _loadDistributionNullable() {
        let distro;
        if (!this.devMode) {
            distro = (await this.pullRemote()).data;
            if (distro == null) {
                distro = await this.pullLocal();
            }
            else {
                await this.writeDistributionToDisk(distro);
            }
        }
        else {
            distro = await this.pullLocal();
        }
        return distro;
    }
    async pullRemote() {
        try {
            const res = await got_1.default.get(this.remoteUrl, { responseType: 'json' });
            let data = res.body;
            const isFirstLaunch = localStorage.getItem('isFirstLaunch') !== 'false';  
            
            if (!isFirstLaunch) {
                // 첫 번째 호출 이후에는 "type": "File"이 포함된 모듈 제외
                data = this.filterOutFileTypeModules(data);
            }
            this.isFirstFetch = false;  // 첫 번째 호출 이후 플래그 업데이트
            localStorage.setItem('isFirstLaunch', 'false');  // 로컬 스토리지 업데이트

            return {
                data,
                responseStatus: RestResponse_1.RestResponseStatus.SUCCESS
            };
        }
        catch (error) {
            return (0, RestResponse_1.handleGotError)('Pull Remote', error, DistributionAPI.log, () => null);
        }
        
    }

    filterOutFileTypeModules(data) {
        if (Array.isArray(data.servers)) {
            data.servers.forEach(server => {
                if (Array.isArray(server.modules)) {

                    server.modules = server.modules.filter(module => module.type !== 'File');
                }
            });
        }
        return data;
    }
    
    

    async writeDistributionToDisk(distribution) {
        await (0, fs_extra_1.writeJson)(this.distroPath, distribution);
    }
    async pullLocal() {
        return await this.readDistributionFromFile(!this.devMode ? this.distroPath : this.distroDevPath);
    }
    async readDistributionFromFile(path) {
        if (await (0, fs_extra_1.pathExists)(path)) {
            const raw = await (0, fs_extra_1.readFile)(path, 'utf-8');
            try {
                return JSON.parse(raw);
            }
            catch (error) {
                DistributionAPI.log.error(`Malformed distribution file at ${path}`);
                return null;
            }
        }
        else {
            DistributionAPI.log.error(`No distribution file found at ${path}!`);
            return null;
        }
    }
}
exports.DistributionAPI = DistributionAPI;
