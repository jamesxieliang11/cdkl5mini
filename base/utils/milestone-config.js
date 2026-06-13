const MILESTONE_CATEGORIES = [
  {
    name: '大运动',
    items: [
      { id: 'gross_head_control', label: '能抬头' },
      { id: 'gross_roll_over', label: '能翻身' },
      { id: 'gross_sit', label: '能独坐' },
      { id: 'gross_crawl', label: '能爬行' },
      { id: 'gross_stand_support', label: '能扶站' },
      { id: 'gross_stand_alone', label: '能独站' },
      { id: 'gross_walk_support', label: '能扶走' },
      { id: 'gross_walk_alone', label: '能独走' }
    ]
  },
  {
    name: '精细运动',
    items: [
      { id: 'fine_grasp', label: '能抓握' },
      { id: 'fine_transfer', label: '能传递' },
      { id: 'fine_pincer', label: '能拇食指捏' },
      { id: 'fine_spoon', label: '能用勺子' }
    ]
  },
  {
    name: '语言认知',
    items: [
      { id: 'lang_eye_contact', label: '有眼神交流' },
      { id: 'lang_vocalize', label: '能发出声音' },
      { id: 'lang_single_word', label: '能说单字' },
      { id: 'lang_phrases', label: '能说词组' },
      { id: 'lang_understand', label: '能理解简单指令' },
      { id: 'lang_recognize_family', label: '能认识家人' }
    ]
  },
  {
    name: '社交情感',
    items: [
      { id: 'social_smile', label: '有社交微笑' },
      { id: 'social_stranger_anxiety', label: '能认生' },
      { id: 'social_separation_anxiety', label: '有分离焦虑' },
      { id: 'social_imitate', label: '能模仿动作' }
    ]
  }
]

const MILESTONE_LABELS = {}
MILESTONE_CATEGORIES.forEach(category => {
  category.items.forEach(item => {
    MILESTONE_LABELS[item.id] = item.label
  })
})

module.exports = { MILESTONE_CATEGORIES, MILESTONE_LABELS }
