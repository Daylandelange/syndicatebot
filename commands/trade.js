/* eslint-disable no-shadow */
/* eslint-disable max-nested-callbacks */
const Discord = require('discord.js');
module.exports = {
	name: 'trade',
	summary: 'Trade money or items to other people',
	description: 'Trade money and items to other people.',
	aliases: ['give', 'donate', 'transfer'],
	category: 'economy',
	args: false,
	usage: '',

	async execute(message, args, msgUser, profile, guildProfile, client, logger, cooldowns) {

		const filter = m => m.author.id === message.author.id;
		const embed = new Discord.MessageEmbed()
			.setTitle('Neia Trading Center')
			.setColor(msgUser.pColour)
			.setTimestamp()
			.setFooter('Neia', client.user.displayAvatarURL());


		message.channel.send(embed)
			.then(async sentMessage => {
				let target;
				let amount = 0;
				let temp = '';

				for (let i = 0; i < args.length; i++) {
					if (!(isNaN(args[i]))) amount = parseInt(args[i]);

					else if (args[i].startsWith('<@') && args[i].endsWith('>')) {
						let mention = args[i].slice(2, -1);
						if (mention.startsWith('!')) mention = mention.slice(1);
						target = client.users.cache.get(mention);
						embed.setThumbnail(target.displayAvatarURL());
					}

					else if (temp.length > 2) temp += ` ${args[i]}`;
					else temp += `${args[i]}`;
				}

				const item = await profile.getItem(temp);
				if (target && item) itemTrade(profile, target, amount, item, sentMessage, embed, message);
				else if (target && amount > 1) moneyTrade(profile, target, amount, sentMessage, embed, message);
				else {
					sentMessage.edit(embed.setDescription('Who do you want to trade with? __mention the user__\n'));
					message.channel.awaitMessages(filter, { max: 1, time: 60000 })

						.then(async collected => {
							let mention = collected.first().content;
							collected.first().delete();

							if (mention.startsWith('<@') && mention.endsWith('>')) {
								mention = mention.slice(2, -1);
								if (mention.startsWith('!')) mention = mention.slice(1);
								target = client.users.cache.get(mention);
								embed.setThumbnail(target.displayAvatarURL());
							}
							else return sentMessage.edit(embed.setDescription(`${mention} is not a valid response`));


							sentMessage.edit(embed.setDescription(`Trading with *${target}*\n\nWhat do you want to send (answer with a number to send money)?`))
								.then(() => {
									message.channel.awaitMessages(filter, { max: 1, time: 60000 })

										.then(async collected => {
											const goods = collected.first().content.toLowerCase();
											collected.first().delete();

											// item trade
											if (isNaN(goods)) {

												const item = await profile.getItem(goods);
												if (!item) return sentMessage.edit(embed.setDescription(`${item} doesn't exist.`));

												// item trade
												sentMessage.edit(embed.setDescription(`Trading with *${target}*\n\nHow much __${item.name}(s)__ do you want to send?`)).then(() => {
													message.channel.awaitMessages(filter, { max: 1, time: 60000 })

														.then(async collected => {
															const amount = collected.first().content;
															collected.first().delete();

															if (await profile.hasItem(message.author.id, item, amount)) itemTrade(profile, target, amount, item, sentMessage, embed, message);
															else return sentMessage.edit(embed.setDescription(`You don't have enough __${item.name}(s)__!`));
														})
														.catch(e => {
															logger.error(e.stack);
															message.reply('you didn\'t answer in time.');
														});
												});
											}
											else moneyTrade(profile, target, amount, sentMessage, embed, message);
										})
										.catch(e => {
											logger.error(e.stack);
											message.reply('you didn\'t answer in time.');
										});
								})
								.catch(e => {
									logger.error(e.stack);
									message.reply('you didn\'t answer in time.');
								});
						});
				}
			});
	},
};

async function itemTrade(profile, target, amount, item, sentMessage, embed, message) {
	if (!Number.isInteger(amount)) return sentMessage.edit(embed.setDescription(`${amount} is not a number`));
	else if (amount < 1) amount = 1;

	profile.addItem(target.id, item, amount);
	profile.removeItem(message.author.id, item, amount);
	sentMessage.edit(embed.setDescription(`Trade with *${target}* succesfull!\n\nTraded ${amount} ${item.emoji}__${item.name}__ to *${target}*.`));
}

async function moneyTrade(profile, target, amount, sentMessage, embed, message) {
	if (!Number.isInteger(amount)) return sentMessage.edit(embed.setDescription(`${amount} is not a number`));
	else if (amount < 1) amount = 1;

	const balance = await profile.getBalance(message.author.id);

	if (!amount || isNaN(amount)) return sentMessage.edit(embed.setDescription(`Sorry *${message.author}*, that's an invalid amount.`));
	if (amount > balance) return sentMessage.edit(embed.setDescription(`You only have ${profile.formatNumber(balance)}💰 but need ${profile.formatNumber(amount)}.`));
	if (amount <= 0) return sentMessage.edit(embed.setDescription(`Please enter an amount greater than zero, *${message.author}*.`));

	profile.addMoney(message.author.id, -amount);
	profile.addMoney(target.id, amount);
	return sentMessage.edit(embed.setDescription(`Trade with *${target}* succesfull!\n\nTransferred ${profile.formatNumber(amount)}💰 to *${target}*.\nYour current balance is ${profile.formatNumber(await profile.getBalance(message.author.id))}💰`));

}