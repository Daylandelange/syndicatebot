const Discord = require('discord.js');
module.exports = {
	name: 'Trade',
	summary: 'Trade money to other people',
	description: 'Trade money to other people.',
	aliases: ['give', 'donate', 'transfer'],
	category: 'misc',
	args: true,
	usage: '<target> <amount>',
	example: '@overlordOE 25',

	async execute(message, args, msgUser, msgGuild, client, logger) {

		const embed = new Discord.MessageEmbed()
			.setTitle('Project Neia Trading Center')
			.setFooter('You can only trade to people on the same server.', client.user.displayAvatarURL());

		let target;
		let targetUser;
		let amount = 0;
		let temp = '';

		for (let i = 0; i < args.length; i++) {
			if (!(isNaN(args[i]))) amount = parseInt(args[i]);

			else if (args[i].startsWith('<@') && args[i].endsWith('>')) {
				let mention = args[i].slice(2, -1);
				if (mention.startsWith('!')) mention = mention.slice(1);
				target = client.users.cache.get(mention);
				targetUser = await client.userCommands.getUser(target.id);
				embed.setThumbnail(target.displayAvatarURL());
			}

			else if (temp.length > 2) temp += ` ${args[i]}`;
			else temp += `${args[i]}`;
		}


		message.channel.send(embed)
			.then(sentMessage => {
				// const item = client.userCommands.getItem(temp);
				// if (target && item) itemTrade(client, target, amount, item, sentMessage, embed, msgUser);
				if (target && amount > 1) moneyTrade(sentMessage);
				else if (amount > 1) return sentMessage.edit(embed.setDescription('You didn\'t specify a target, please try again.'));
				else if (amount < 1) return sentMessage.edit(embed.setDescription('You can\'t trade 0 or negative amounts, please try again.'));
				else if (target) return sentMessage.edit(embed.setDescription('You didn\'t specify the amount you want to send, please try again.'));
				else return sentMessage.edit(embed.setDescription('You didn\'t specify the amount you want to send or the target you want to send it too, please try again.'));
			});


		function moneyTrade(sentMessage) {
			if (!Number.isInteger(amount)) return sentMessage.edit(embed.setDescription(`${amount} is not a number`));
			else if (amount < 1) amount = 1;

			let balance = msgUser.balance;

			if (!amount || isNaN(amount)) return sentMessage.edit(embed.setDescription(`${amount} is an invalid amount.`));
			if (amount > balance) return sentMessage.edit(embed.setDescription(`You only have ${client.util.formatNumber(balance)}💰 but need ${client.util.formatNumber(amount)}.`));
			if (amount <= 0) return sentMessage.edit(embed.setDescription('Please enter an amount greater than zero.'));

			balance = client.userCommands.addBalance(msgUser, -amount);
			client.userCommands.addBalance(targetUser, amount);
			return sentMessage.edit(embed.setDescription(
				`Trade with *${target}* succesfull!\n\nTransferred ${client.util.formatNumber(amount)}💰 to *${target}*.
				Your current balance is ${client.util.formatNumber(balance)}💰`));
		}


		/*
		async function itemTrade(client, target, amount, item, sentMessage, embed, msgUser) {
			if (!Number.isInteger(amount)) return sentMessage.edit(embed.setDescription(`${amount} is not a number`));
			else if (amount < 1) amount = 1;

			client.userCommands.addItem(await client.userCommands.getUser(target.id), item, amount);
			client.userCommands.removeItem(msgUser, item, amount);
			sentMessage.edit(embed.setDescription(`Trade with *${target}* succesfull!\n\nTraded ${amount} ${item.emoji}__${item.name}__ to *${target}*.`));
		}
		*/
	},
};

