const emojiCharacters = require('../emojiCharacters');
const Discord = require('discord.js');
const rpsRate = 0.85;
const numberRate = 2.5;
const blackjackRate = 1.5;
module.exports = {
	name: 'gamble',
	description: 'Gives you a list of minigames to play to make some money with.',
	admin: false,
	aliases: ['guess'],
	args: true,
	usage: 'money',
	owner: false,
	music: false,

	async execute(msg, args, profile, bot, options, ytAPI, logger, cooldowns, dbl) {
		const currentAmount = await profile.getBalance(msg.author.id);
		const pColour = await profile.getPColour(msg.author.id);
		const bAvatar = bot.user.displayAvatarURL();
		const avatar = msg.author.displayAvatarURL();
		let gambleAmount = 0;
		let gambleType = '';

		const filter = (reaction, user) => {
			return ['✂️', emojiCharacters[5], '🃏'].includes(reaction.emoji.name) && user.id === msg.author.id;
		};

		const embed = new Discord.MessageEmbed()
			.setColor(pColour)
			.setThumbnail(avatar)
			.setTimestamp()
			.setTitle('Neija\'s Gambling Imporium')
			.setFooter('Neija', bAvatar);


		await msg.channel.send(embed)
			.then(sentMessage => {

				for (let i = 0; i < args.length; i++) {
					if (!(isNaN(args[i]))) gambleAmount = parseInt(args[i]);
					else if (args[i] == 'all') gambleAmount = parseInt(currentAmount);
					else if (gambleType.length > 2) gambleType += ` ${args[i]}`;
					else gambleType += `${args[i]}`;
				}

				if (!gambleAmount || isNaN(gambleAmount)) return msg.channel.send(embed.setDescription(`Sorry ${msg.author}, that's an invalid amount.`));
				if (gambleAmount > currentAmount) return msg.channel.send(embed.setDescription(`Sorry ${msg.author}, you only have ${currentAmount}💰.`));
				if (gambleAmount <= 0) return msg.channel.send(embed.setDescription(`Please enter an amount greater than zero, ${msg.author}.`));

				if (gambleType == 'rock' || gambleType == 'rps' || gambleType == 'rock paper scissors' || gambleType == 'r') RPS(msg, profile, logger, gambleAmount, currentAmount, sentMessage, embed);
				else if (gambleType == 'number' || gambleType == 'numbers') oneInFive(msg, profile, logger, gambleAmount, sentMessage, embed);
				else if (gambleType == 'blackjack' || gambleType == 'jack' || gambleType == 'black') blackjack(msg, profile, logger, gambleAmount, sentMessage, embed);


				else {
					sentMessage.edit(embed.setDescription(`You have bet **${gambleAmount}💰**, you can play the following games:\n

							${emojiCharacters[5]}__**Number Guessing**__\n 
							Guess which number is correct, guess right and you win.\n
							**Potential winnings: ${(numberRate * gambleAmount)}💰**\n

							✂️__**Rock, paper, scissors**__\n
							Play a game of rock, paper, scissors against the bot and see who is superior.\n
							**Potential winnings: ${(rpsRate * gambleAmount)}💰**

							🃏__**Blackjack**__\n
							Play a game of blackjack against the bot and test your luck.\n
							**Potential winnings: ${(blackjackRate * gambleAmount)}💰**
			`));
					sentMessage.react('✂️');
					sentMessage.react(emojiCharacters[5]);
					sentMessage.react('🃏');

					sentMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
						.then(async collected => {
							const reaction = collected.first();

							sentMessage.reactions.removeAll();
							if (reaction.emoji.name == emojiCharacters[5]) oneInFive(msg, profile, logger, gambleAmount, sentMessage, embed);
							else if (reaction.emoji.name == '✂️') RPS(msg, profile, logger, gambleAmount, currentAmount, sentMessage, embed);
							else if (reaction.emoji.name == '🃏') blackjack(msg, profile, logger, gambleAmount, sentMessage, embed);
						})
						.catch(e => {
							msg.reply('You failed to react in time.');
							logger.log('error', e);
						});
				}
			})
			.catch(e => {
				logger.log('error', `One of the emojis failed to react because of:\n${e}`);
				return msg.reply('One of the emojis failed to react.');
			});
	},
};


async function oneInFive(msg, profile, logger, gambleAmount, sentMessage, embed) {
	const filter = (reaction, user) => {
		return [emojiCharacters[1], emojiCharacters[2], emojiCharacters[3], emojiCharacters[4], emojiCharacters[5]].includes(reaction.emoji.name) && user.id === msg.author.id;
	};

	const answer = Math.floor((Math.random() * 5) + 1);
	const winAmount = numberRate * gambleAmount;

	await sentMessage.edit(embed.setDescription(`You have bet **${gambleAmount}💰**.\nGuess the number between 1 and 5.`))
		.then(() => {
			sentMessage.react(emojiCharacters[1]);
			sentMessage.react(emojiCharacters[2]);
			sentMessage.react(emojiCharacters[3]);
			sentMessage.react(emojiCharacters[4]);
			sentMessage.react(emojiCharacters[5]);
		})
		.catch(e => {
			logger.log('error', `One of the emojis failed to react because of:\n${e}`);
			return msg.reply('One of the emojis failed to react.');
		});


	sentMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
		.then(async collected => {
			const reaction = collected.first();


			if (reaction.emoji.name === emojiCharacters[answer]) {
				profile.addMoney(msg.author.id, winAmount);
				const balance = await profile.getBalance(msg.author.id);

				embed.setColor('#00fc43');
				return sentMessage.edit(embed.setDescription(`Correct! You have successfully won **${winAmount}💰**.\nYour current balance is **${balance}💰**`));
			}
			else {
				profile.addMoney(msg.author.id, -gambleAmount);
				const balance = await profile.getBalance(msg.author.id);

				embed.setColor('#fc0303');
				return sentMessage.edit(embed.setDescription(`The correct answer was ${answer}. You lost **${gambleAmount}💰**.\nYour current balance is **${balance}💰**`));
			}
		})
		.catch(collected => {
			msg.reply('You failed to react in time.');
			logger.log('error', collected);
		});

}


async function blackjack(msg, profile, logger, gambleAmount, sentMessage, embed) {
	const filter = (reaction, user) => {
		return ['🃏', '✅'].includes(reaction.emoji.name) && user.id === msg.author.id;
	};

	const suits = ['♠️', '♥️', '♦️', '♣️'];
	const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
	let playerHandValue = 0;
	let botHandValue = 0;
	let playerHand = '';
	let botHand = '';

	const winAmount = blackjackRate * gambleAmount;


	await sentMessage.edit(embed
		.setDescription('Blackjack')
	)
		.then(() => {
			sentMessage.react('🃏'); // result 1
			sentMessage.react('✅'); // result 2

			const collector = sentMessage.createReactionCollector(filter, { time: 60000 });

			for (let i = 0; i < 2; i++) {
				getCard('player');
				getCard('bot');
			}
			setEmbed();

			if (playerHandValue > 21 || botHandValue > 21) {
				collector.stop();
			}

			collector.on('collect', (reaction) => {
				reaction.users.remove(msg.author.id);

				switch (reaction.emoji.name) {

					case '🃏':

						reaction.users.remove(msg.author.id);
						getCard('player');
						if (botHandValue < 17) getCard('bot');
						setEmbed();
						if (playerHandValue > 20) {
							collector.stop();
							return;
						}
						break;

					case '✅':

						while (botHandValue < 17) {
							getCard('bot');
							setEmbed();
						}
						collector.stop();
						return;
				}
			});

			collector.on('end', async () => {
				if (playerHandValue > 21) {

					profile.addMoney(msg.author.id, -gambleAmount);
					const balance = await profile.getBalance(msg.author.id);
					embed.setColor('#fc0303');
					sentMessage.edit(embed.setDescription(`__**You busted**__\n\nYour balance is **${balance}💰**`));
				}
				else if (botHandValue > 21) {

					profile.addMoney(msg.author.id, winAmount);
					const balance = await profile.getBalance(msg.author.id);
					embed.setColor('#00fc43');
					return sentMessage.edit(embed.setDescription(`__**The bot busted**__. **You Win!**\n\nYou won **${winAmount}💰** and your balance is **${balance}💰**`));
				}
				else if (botHandValue >= playerHandValue) {

					profile.addMoney(msg.author.id, -gambleAmount);
					const balance = await profile.getBalance(msg.author.id);
					embed.setColor('#fc0303');
					sentMessage.edit(embed.setDescription(`__**The bot wins**__\n\nYour balance is **${balance}💰**`));
				} else if (playerHandValue > botHandValue) {

					profile.addMoney(msg.author.id, winAmount);
					const balance = await profile.getBalance(msg.author.id);
					embed.setColor('#00fc43');
					sentMessage.edit(embed.setDescription(`__**You win**__\n\nYou won **${winAmount}💰** and your balance is **${balance}💰**`));
				}
				return;
			});
		})
		.catch(e => {
			logger.log('error', e);
			return msg.reply('Something went wrong, please report this as a bug.');
		});

	function setEmbed() {
		embed.spliceFields(0, 2, [
			{ name: 'Player Hand', value: playerHand },
			{ name: 'Bot Hand', value: botHand },
		]);
		sentMessage.edit(embed);
	}

	function getCard(player) {

		const suit = Math.floor((Math.random() * 4));
		const number = Math.floor((Math.random() * 13));

		let weight = parseInt(values[number]);
		if (values[number] == 'J' || values[number] == 'Q' || values[number] == 'K') { weight = 10; }
		if (values[number] == 'A') { weight = 11; }
		const card = { value: values[number], suit: suits[suit], weight: weight };

		if (player == 'bot') {
			botHand += `${card.suit}${card.value} `;
			botHandValue += card.weight;
		}
		else if (player == 'player') {
			playerHand += `${card.suit}${card.value} `;
			playerHandValue += card.weight;
		}
		return card;
	}
}

async function RPS(msg, profile, logger, gambleAmount, currentAmount, sentMessage, embed) {
	const filter = (reaction, user) => {
		return ['✊', '🧻', '✂️'].includes(reaction.emoji.name) && user.id === msg.author.id;
	};

	const winAmount = rpsRate * gambleAmount;
	const answer = Math.floor((Math.random() * 3) + 1);

	await sentMessage.edit(embed.setDescription(`You have bet **${gambleAmount}💰**.\nChoose rock✊, paper🧻 or scissors✂️!`))
		.then(() => {
			sentMessage.react('✊'); // result 1
			sentMessage.react('🧻'); // result 2
			sentMessage.react('✂️'); // result 3
		})
		.catch(e => {
			logger.log('error', `One of the emojis failed to react because of:\n${e}`);
			return msg.reply('One of the emojis failed to react.');
		});


	sentMessage.awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
		.then(async collected => {
			const reaction = collected.first();
			switch (reaction.emoji.name) {
				case '✊':
					if (answer == 1) { return sentMessage.edit(embed.setDescription(`The bot chooses ✊. **It's a tie!**\nYour balance is **${currentAmount}💰**`)); }
					else if (answer == 2) {
						profile.addMoney(msg.author.id, -gambleAmount);
						const balance = await profile.getBalance(msg.author.id);

						embed.setColor('#fc0303');
						return sentMessage.edit(embed.setDescription(`The bot chooses 🧻. **You lose!**\nYour balance is **${balance}💰**`));
					}
					else if (answer == 3) {
						profile.addMoney(msg.author.id, winAmount);
						const balance = await profile.getBalance(msg.author.id);

						embed.setColor('#00fc43');
						return sentMessage.edit(embed.setDescription(`The bot chooses ✂️. **You Win!**\nYou won **${winAmount}💰** and your balance is **${balance}💰**`));
					}
					break;

				case '🧻':
					if (answer == 1) {
						profile.addMoney(msg.author.id, winAmount);
						const balance = await profile.getBalance(msg.author.id);

						embed.setColor('#00fc43');
						return sentMessage.edit(embed.setDescription(`The bot chooses ✊. **You Win!**\nYou won **${winAmount}💰** and your balance is **${balance}💰**`));
					}
					else if (answer == 2) { return sentMessage.edit(embed.setDescription(`The bot chooses 🧻. **It's a tie!**\nYour balance is **${currentAmount}💰**`)); }
					else if (answer == 3) {
						profile.addMoney(msg.author.id, -gambleAmount);
						const balance = await profile.getBalance(msg.author.id);

						embed.setColor('#fc0303');
						return sentMessage.edit(embed.setDescription(`The bot chooses ✂️. **You lose!**\nYour balance is **${balance}💰**`));
					}
					break;

				case '✂️':
					if (answer == 1) {
						profile.addMoney(msg.author.id, -gambleAmount);
						const balance = await profile.getBalance(msg.author.id);

						embed.setColor('#fc0303');
						return sentMessage.edit(embed.setDescription(`The bot chooses ✊. **You lose!**\nYour balance is **${balance}💰**`));
					}
					else if (answer == 2) {
						profile.addMoney(msg.author.id, winAmount);
						const balance = await profile.getBalance(msg.author.id);

						embed.setColor('#00fc43');
						return sentMessage.edit(embed.setDescription(`The bot chooses 🧻. **You Win!**\nYou won **${winAmount}💰** and your balance is **${balance}💰**`));
					}
					else if (answer == 3) { return sentMessage.edit(embed.setDescription(`The bot chooses ✂️. **It's a tie!**\nYour balance is **${currentAmount}💰**`)); }
					break;
			}

			sentMessage.edit(embed.setDescription('You shouldnt see this'));
		})
		.catch(collected => {
			msg.reply('You failed to react in time.');
			logger.log('error', collected);
		});
}
