import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder,
} from 'discord.js';
import { RANK_LABEL, cardGlyph } from './game/deck.js';

// palette pulled straight from the "Ashfall Table" UI theme
export const COLOR_FOG = 0x5a5e66;
export const COLOR_EMBER = 0xc4472f;
export const COLOR_SIGNAL = 0x8a9a8c;

export function lobbyEmbed(game) {
  const names = game.joinOrder.map((id, i) => `${i + 1}. ${game.players.get(id).name}`).join('\n')
    || 'ما فيه ناجين لسا…';
  return new EmbedBuilder()
    .setColor(COLOR_FOG)
    .setTitle('🧭 طاولة الأيس — ASHFALL TABLE')
    .setDescription('طاولة كذب وبلاف. كل لاعب يدّعي، والبقية يقررون: يصدّقون ولا يكذّبون.\nمن يُكشف كذبه أو يخطئ بالتكذيب، يسحب من مسدسه.')
    .addFields(
      { name: 'الناجون على الطاولة', value: names },
      { name: 'الحد الأدنى/الأقصى', value: '٢ – ٤ لاعبين' },
    )
    .setFooter({ text: 'اضغط "انضم" عشان تدخل الطاولة' });
}

export function lobbyButtons(canStart) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('lobby_join').setLabel('انضم للطاولة').setEmoji('🪶').setStyle(ButtonStyle.Secondary),
    new ButtonBuilder().setCustomId('lobby_start').setLabel('ابدأ اللعبة').setEmoji('🔥').setStyle(ButtonStyle.Danger).setDisabled(!canStart),
  );
  return [row];
}

export function roundEmbed(game) {
  const currentId = game.currentPlayerId();
  const current = game.players.get(currentId);
  const lives = game.activePlayers().map((p) => {
    const chambersLeft = 6 - p.cylinder;
    return `**${p.name}** — 🔫 ${chambersLeft}/6`;
  }).join('\n');

  const e = new EmbedBuilder()
    .setColor(COLOR_FOG)
    .setTitle(`🌫️ الجولة ${game.round} — النار على ${RANK_LABEL[game.target]}`)
    .addFields({ name: 'حظوظ المسدسات', value: lives });

  if (game.pendingPlay) {
    const claimant = game.players.get(game.pendingPlay.playerId);
    e.setColor(COLOR_EMBER);
    e.setDescription(
      `**${claimant.name}** يدّعي أنه لعب **${game.pendingPlay.cards.length}×** بطاقة من نوع **${RANK_LABEL[game.target]}**\n\n`
      + `دور **${current.name}**: يصدّق ولا يكذّب؟`,
    );
  } else {
    e.setDescription(`دور **${current.name}**: اختر بطاقاتك وادّعِ إنها **${RANK_LABEL[game.target]}**.`);
  }
  return e;
}

export function actionButtons(game) {
  const rows = [];
  if (game.pendingPlay) {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('act_believe').setLabel('تصديق').setEmoji('🃏').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('act_doubt').setLabel('تكذيب').setEmoji('🔍').setStyle(ButtonStyle.Danger),
    ));
  } else {
    rows.push(new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('act_play').setLabel('العب بطاقات').setEmoji('🪦').setStyle(ButtonStyle.Primary),
    ));
  }
  return rows;
}

export function handSelectMenu(playerId, hand) {
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`hand_select_${playerId}`)
    .setPlaceholder('اختر من ١ إلى ٣ بطاقات تلعبها')
    .setMinValues(1)
    .setMaxValues(Math.min(3, hand.length))
    .addOptions(hand.map((c) => ({
      label: `${cardGlyph(c)} — ${RANK_LABEL[c.rank]}`,
      value: c.id,
    })));
  return [new ActionRowBuilder().addComponents(menu)];
}

export function resolutionEmbed(game, result) {
  const claimant = null; // not needed after resolution
  const loser = game.players.get(result.loserId);
  const revealed = result.cards.map((c) => `${cardGlyph(c)}`).join('  ');

  const e = new EmbedBuilder()
    .setColor(result.eliminated ? COLOR_EMBER : COLOR_SIGNAL)
    .setTitle(result.truth ? '✅ الادّعاء كان صادق' : '🔥 الادّعاء كان كذب')
    .setDescription(`البطاقات المكشوفة: ${revealed}\n\n**${loser.name}** يسحب من مسدسه…`)
    .addFields({
      name: result.eliminated ? '💀 الطلقة أصابت' : '😮‍💨 نجا',
      value: result.eliminated
        ? `**${loser.name}** طاح من الطاولة.`
        : `**${loser.name}** نجا — الغرفة رقم ${result.chamber}/6.`,
    });

  if (result.gameOver) {
    const winner = result.winnerId ? game.players.get(result.winnerId) : null;
    e.setColor(COLOR_EMBER);
    e.addFields({ name: '🏆 نهاية اللعبة', value: winner ? `**${winner.name}** هو الناجي الأخير.` : 'انتهت اللعبة.' });
  }

  return e;
}
