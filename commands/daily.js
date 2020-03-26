const { Users, CurrencyShop } = require('../dbObjects');
var moment = require('moment');
module.exports = {
	name: 'daily',
	description: 'Get your daily reward.',
	admin: false,
	aliases: ["gift"],
	args: false,
	cooldown: 5,
	async execute(msg, args, profile) {
		const lastDaily = profile.getDaily(msg.author.id);
		const day = moment().dayOfYear();
		const reward = 10 + (Math.random() * 10);

		if (day > lastDaily) {

			msg.reply(`Your daily 🎁 is ${Math.floor(reward)}💰, come back tomorrow for more`);
			profile.setDaily(msg.author.id);
			profile.addMoney(msg.author.id, reward);
		} else {
			msg.reply(`you have already gotten your daily 🎁, come back tomorrow`);
		}

	},
};