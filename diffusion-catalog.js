export const sessions = {
 still: {id:'still-enough-to-listen', page:'still-enough.html', title:'Still Enough to Listen', description:'Nine quiet minutes to be still, notice your breath, and perhaps hear your heartbeat.', duration:540, file:'still-enough-to-listen-v5', color:'pearl', layout:'normal', phase:0},
 soft: {id:'soft-place-to-land', page:'soft-place-to-land.html', title:'A Soft Place to Land', description:'A warm voice, a little sound, and room to settle. Nothing to do for a while.', duration:570, file:'soft-place-to-land-v5', color:'honey', layout:'mirror', phase:14},
 let: {id:'let-them-think', page:'let-them-think.html', title:'Let Them Think What They Think', description:'A little room to be yourself, without carrying every opinion.', duration:685, file:'let-them-think-v4', color:'slate', layout:'cross', phase:25},
 life: {id:'precious-life', page:'precious-life.html', title:'This Precious Life', description:'A little time with an ordinary moment, and the life here in this breath.', duration:660, file:'this-precious-life-v3', color:'linen', layout:'inverted', phase:36}
};
export const clock = seconds => `${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`;
