const Discord = require('discord.js');
const cron = require('cron');
const fs = require('fs');
module.exports = {
	name: 'lottery',
	category: 'debug',

	async execute(msg, args, profile, guildProfile, bot, options, ytAPI, logger, cooldowns) {
		//	crontime: 0 0-23/3 * * *	collectortime: 10796250		channelID: 721743056528867393
		const lotteryJob = new cron.CronJob('0 0-23/3 * * *', async () => {

			let writeData;
			const ticketAmount = 50;
			const misc = JSON.parse(fs.readFileSync('miscData.json'));
			const channel = bot.channels.cache.get('721743056528867393');
			const bAvatar = bot.user.displayAvatarURL();
			const pColour = await profile.getPColour(msg.author.id);
			const buyin = 5;

			let lottery = misc.lastLottery;
			let duplicate = false;
			let players = 'Current participants:';
			const description = `Press 💰 to participate in the lottery!\nPress 🔔 to get notified when the lottery ends.\n**${buyin}💰** buy-in.`;

			const participants = [];
			const tickets = [];
			for (let i = 0; i < ticketAmount; i++) tickets[i] = i;
			
			const embed = new Discord.MessageEmbed()
				.setTitle('Neia Lottery')
				.setDescription(`${description}\nCurrent jackpot: **${lottery}💰**!`)
				.setColor(pColour)
				.setTimestamp()
				.setFooter('Neia', bAvatar);

			const filter = (reaction, user) => {
				return ['💰', '🔔'].includes(reaction.emoji.name) && !user.bot;
			};

			await channel.send(embed)
				.then(sentMessage => {
					sentMessage.react('💰');
					sentMessage.react('🔔');

					const collector = sentMessage.createReactionCollector(filter, { time: 10796250 });

					collector.on('collect', async (r, user) => {

						if (r.emoji.name == '🔔') {
							const info = participants.findIndex(ticket => ticket.user.id == user.id);
							participants[info].notify = true;
							user.send(`You will be notified when the lottery will end\n\nThis lottery has a jackpot of **${lottery}💰** \nYour ticket number is __**${parseInt(participants[info].ticketNumber) + 1}**__.`);
						}
						else if (r.emoji.name == '💰') {
							for (let i = 0; i < participants.length; i++) {
								if (user.id == participants[i].id) {
									duplicate = true;
									break;
								}
							}
							if (!duplicate) {
								const bCheck = await profile.getBalance(user.id);

								if (bCheck >= buyin) {
									const ticketNumber = tickets.splice(Math.floor(Math.random() * tickets.length), 1);
									const ticket = {
										user: user,
										ticketNumber: ticketNumber,
										notify: false,
									};
									participants.push(ticket);
									profile.addMoney(user.id, -buyin);
									players += `\n${parseInt(ticketNumber) + 1}: ${user}`;
									lottery = misc.lastLottery + (participants.length * buyin);
									sentMessage.edit(embed.setDescription(`${description}\nCurrent lottery: **${lottery}💰**\n${players}`));
								}
								else {
									user.send(`You only have **${bCheck}💰** but the buy-in is **${buyin}💰**.`);
								}
							}
							duplicate = false;
						}
					});


					collector.on('end', () => {

						const winNumber = Math.floor(Math.random() * ticketAmount);
						const winner = participants.find(ticket => ticket.ticketNumber == winNumber);

						if (winner) {
							profile.addMoney(winner.user.id, lottery);
							channel.send(`Congrats ${winner.user} on winning the jackpot of **${lottery}💰**!!!`);
							sentMessage.edit(embed.setDescription(`Current lottery: **${lottery}💰**\n${players}\n\nLottery has ended and the winning number is __**${winNumber + 1}**__\n*${winner.user}* has won the lottery of **${lottery}💰**`));
							misc.lastLottery = ticketAmount;
						}

						for (let i = 0; i < participants.length; i++) {
							if (participants[i].notify) {
								if (winner) winner.user.send(`The lottery has ended\nYou have won the lottery with lucky number __**${winNumber + 1}**__ and won **${lottery}💰**!\n\nThe next jackpot will be **${ticketAmount}💰** and is starting in 1 minute`);
								else participants[i].user.send(`The lottery has ended\nThe winning number is __**${winNumber + 1}**__ but you had the number __**${parseInt(participants[i].ticketNumber) + 1}**__.\n\nThe next jackpot will be **${misc.lastLottery}💰** and is starting in 1 minute`);

							}
						}

						if (!winner) {
							misc.lastLottery = lottery + ticketAmount;
							sentMessage.edit(embed.setDescription(`Current lottery: **${lottery}💰**\n${players}\n\nLottery has ended and the winning number is __**${winNumber + 1}**__\n\nNoone won the lottery of **${lottery}💰**, it will be added to next days lottery!`));
						}
						writeData = JSON.stringify(misc);
						fs.writeFileSync('miscData.json', writeData);
					});
				})
				.catch(e => {
					logger.error(e.stack);
					return msg.reply('Something went wrong.');
				});
		});
		lotteryJob.start();
		msg.reply('Starting lottery');


	},
};