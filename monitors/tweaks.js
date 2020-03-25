const { Monitor, RichDisplay } = require('klasa');
const { MessageEmbed } = require('discord.js');
const fetch = require('node-fetch');


module.exports = class extends Monitor {

  constructor(...args) {
    super(...args, {
      enabled: true,
      ignoreBots: true,
      ignoreSelf: true,
      ignoreOthers: false,
      ignoreWebhooks: true,
      ignoreEdits: true
    });
  }

  async run(msg) {
    const regex = new RegExp(/\[\[(.*)\]\]/);
    const matches = regex.exec(msg.content);
    if (!matches || !matches[1]) return;
    const response = await fetch(`https://tss-saver.cloud.tyk.io/repoapi/v1/repo?query=${encodeURIComponent(matches)}`)
    const data = await response.json();
    if (!data.results.length) return msg.send('No Tweak found.');
    const tweak = data.results[0];
    const display = new RichDisplay().useCustomFooters();
    const tweakInfoEmbed = new MessageEmbed()
      .setTitle(tweak.display)
      .setThumbnail(tweak.img)
      .setColor('GREEN')
      .addField('Repo', `[${tweak.repo ? tweak.repo.name : tweak.repo_name}](${tweak.repo ? tweak.repo.url : tweak.repo_url})`, true)
      .addField('Version', tweak.version, true)
      .addField('Price', tweak.paid ? await this.getTweakPrice(tweak) : 'FREE', true)
      .addField('BundleID', tweak.name, true)
      .addField('Download', tweak.deb ? `[Click here](${tweak.deb})` : 'Not available.', true)
      .addField('Description', tweak.summary)
      .setFooter('Provided by: tss-saver.cloud.tyk.io')
      .setTimestamp();
    display.addPage(tweakInfoEmbed);

    const compatibilityData = await this.getCompatibilityData(tweak)
    const tweakCompatibilityEmbed = new MessageEmbed()
      .setTitle(tweak.display)
      .setThumbnail(tweak.img)
      .setColor('GREEN')
      .addField('Version', tweak.version)
      .setFooter('Provided by: jlippold.github.io')
      .setTimestamp();

      if(!compatibilityData || !compatibilityData.length > 0) tweakCompatibilityEmbed.addField('Version Data', 'No version data found.');
      for (let version of compatibilityData) {
        let emoji = '❔'
        switch(version.status.toLowerCase()) {
          case 'working':
            emoji = '✅';
          break;
          case 'not working':
            emoji = '⛔';
          break;
        }
        tweakCompatibilityEmbed.addField(`iOS ${version.iOSVersion}`, emoji, true);
      }
      display.addPage(tweakCompatibilityEmbed);
    return display.run(msg, { firstLast: false, jump: false, time: 120000});
  }

  async init() {}

  async getTweakPrice(tweak) {
    const response = await fetch(`https://tss-saver.cloud.tyk.io/repoapi/v1/price?type=${tweak.type}&query=${tweak.name}`);
    if (response.statusCode === 429) return msg.send('Ratelimit reached!');
    const data = await response.text();
    if (data.length === 0 || data == 0) return 'Paid';
    return `$${data}`;
  }

  async getCompatibilityData(tweak) {
    const response = await fetch(`https://jlippold.github.io/tweakCompatible/json/packages/${tweak.name}.json`);
    const data = await response.json();
    const reports = data.versions.filter((v) => v.tweakVersion === tweak.version && parseInt(v.iOSVersion.split('.')[0]) >= 11)
    const result = [];
    for (let report of reports) {
      result.push({
        iOSVersion: report.iOSVersion,
        status: report.outcome.calculatedStatus
      });
    }
    return result;
  }
};