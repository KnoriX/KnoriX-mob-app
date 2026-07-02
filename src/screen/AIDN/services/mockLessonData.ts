// ─────────────────────────────────────────────────────────────
// services/mockLessonData.ts
// TEMPORARY: local mock lesson data for testing canvas
// without a live backend. Remove/disable once real API is ready.
// ─────────────────────────────────────────────────────────────

export const MOCK_LESSON_PLAN = {
  nodes: [
    {
      id: 'n1',
      node_type: 'markdown',
      order: 1,
      meta: { title: 'Python Inheritance' },
      payload: {
        content:
          '# Python Inheritance\n\nInheritance ek concept hai jisme ek class **doosri class ki properties** le sakti hai.\n\n## Example\n\n```python\nclass Animal:\n    def speak(self):\n        print("...")\n\nclass Dog(Animal):\n    def speak(self):\n        print("Woof!")\n```\n\n> Dog class Animal se inherit karti hai.',
      },
    },
    {
      id: 'n2',
      node_type: 'mcq',
      order: 2,
      meta: { title: 'Quick Check' },
      payload: {
        question:
          'Agar Dog class Animal se inherit karti hai, toh kya Dog ke paas speak() method hoga?',
        options: [
          { id: 'a', text: 'Haan, automatically inherit hoga' },
          { id: 'b', text: 'Nahi, manually define karna padega' },
          { id: 'c', text: 'Sirf tabhi agar Dog khud define kare' },
          { id: 'd', text: 'Inheritance se methods nahi milte' },
        ],
        correctIds: ['a'],
        explanation:
          'Bilkul sahi! Inheritance mein child class automatically parent class ke saare methods le leti hai.',
        timeLimit: 30,
        tags: ['inheritance', 'python', 'oop'],
      },
    },
    {
      id: 'n3',
      node_type: 'katex',
      order: 3,
      meta: { title: 'Formula' },
      payload: {
        latex: 'Child\\ Class \\supseteq Parent\\ Class',
        displayMode: 'single',
        caption: 'Child class mein parent ki saari properties hoti hain',
      },
    },
    {
      id: 'n4',
      node_type: 'skia',
      order: 4,
      meta: { title: 'Diagram Test' },
      payload: {
        commands: [
          { type: 'rect', x: 20, y: 20, width: 100, height: 60, color: '#7C6FFF' },
          { type: 'text', x: 30, y: 100, text: 'Skia Test', color: '#E8E8F0' },
        ],
      },
    },
  ],
};
