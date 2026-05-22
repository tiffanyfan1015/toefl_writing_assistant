# Speaking(Interview) assistant for TOEFL

## TOEFL 題型介紹
You will participate in a simulated interview related to academic or campus situations. You will answer questions about your experiences and opinions, which measures your ability to communicate clearly, maintain a natural speaking pace, and use appropriate vocabulary and grammar.

In the new TOEFL “Take an Interview” task, the interviewer will ask you four questions about the same topic.  You’ll have 45 seconds to answer each one. You must answer as soon as the question is finished. You won’t be given any time to prepare your answers. Note that on the real test you won’t be able to read the questions.  You will only hear them.
### Interview Task Format & Purpose
The Interview task includes four questions, each one designed to test a specific type of thinking and speaking skill.
| Question | Type | Purpose | What It Tests |
| :---: | :--- | :--- | :--- |
| **1** | **Personal Recall** | Warm-up with a memory or life experience | Fluency, vocabulary range, comfort with spontaneous speech |
| **2** | **Emotional Reaction or Preference** | Explore feelings or everyday behaviors | Pronunciation, rhythm, vocabulary precision |
| **3** | **Opinion with Support** | Take a position and justify it | Grammar control, idea development, coherence |
| **4** | **Policy or Prediction** | Speculate or evaluate a broader issue | Complex sentence structure, logical reasoning |




### Example Question 1
#### Introduction
```
You have agreed to take part in a research study about remote work. You will have a short online interview with a researcher. The researcher will ask you some questions.
```
#### Question 1
```
Thank you for speaking with me today. Now, I’d like you to think back to the last time you worked from a location other than your regular workplace—such as your home, a café, or a shared workspace. Why did you choose to work there? What did you enjoy about that experience?
```
#### Question 2
```
Great. Working remotely affects people in different ways. Some find it liberating and productive, while others feel isolated or easily distracted. What kind of reaction do you have to remote work? Why do you think you react in this way?
```
#### Question 3
```
OK. Next, I’d like to ask your opinion. Some people believe that those who work remotely have a better work-life balance. They might argue, for example, that remote workers save commuting time and have more flexibility in their schedules. Do you agree that remote workers enjoy a better work-life balance? Why or why not?
```
#### Question 4
```
Good points. Let me ask you one final question. For some time now, researchers have been interested in whether regular virtual team-building activities help remote workers feel more connected. Do you think that companies should invest more in virtual social events to improve team cohesion and employee satisfaction? Why or why not?
```


### Example Question 2 (Transportation)
#### Introduction
```
You have volunteered for a research study about transportation. You will have a short online interview with a researcher. The researcher will ask you some questions.
Please answer the interviewer’s questions.
```
#### Question 1
```
Thanks for being here. Let’s begin with a personal experience. Can you describe a time when you had an especially good or bad experience with transportation—maybe on a bus, train, or in traffic? What happened, and how did it affect your day?
```
#### Question 2
```
Interesting. Some people enjoy commuting because it gives them time to relax or think, while others find it stressful and tiring. How do you usually feel about your daily travel, and why do you think it affects you that way?
```
#### Question 3
```
Good to know. Some people believe that cities should invest more in public transportation like buses and subways, while others think improving roads for private cars is more important. Which approach do you support, and what are your reasons?
```
#### Question 4
```
OK, let me ask you one final question. Some researchers say that in the near future, self-driving cars will become common. How do you think this change might affect the way people travel? Please give one example of a benefit and one example of a drawback.
```



## Platform
- 設立一個新的 index 頁，區分原本的 writing 頁以及新增的這個 speaking 頁  
- 原本的 writing assistant 完全不變
- 新增 speaking 區塊
### Speaking 頁面包含
#### 首頁
- 像 writing 一樣要有一個新增鍵新增題目
    - 題目可以選擇要自己貼上，還是 AI 產生
    - 每次會有題目名稱、Introduction、Question 1、Question 2、Question 3、Question 4 可以自行輸入或是讓 AI 輸入
- 像 writing 一樣介面上呈現很多題、可以有刪除鍵(刪除前會確認是否真的要刪除)

#### 每一題
- 點進去那一題後，會可以看到過去的作答紀錄(若無則留空)
- 還有一個按鈕是「Practice All」

#### Practice All
- 會先有一個完整的作答流程，包含(每part都一頁)
    - Introduction (播完音檔即換到下一頁)
    - Question 1 (播完音檔即開始計時45秒，同時錄下使用者作答，隨後等待1秒後跳至下一頁)
    - Question 2 (播完音檔即開始計時45秒，同時錄下使用者作答，隨後等待1秒後跳至下一頁)
    - Question 3 (播完音檔即開始計時45秒，同時錄下使用者作答，隨後等待1秒後跳至下一頁)
    - Question 4 (播完音檔即開始計時45秒，同時錄下使用者作答，隨後等待1秒後跳至下一頁)
- 全部完成後到答案檢視頁
- 題目要轉成音檔撥出

#### 答案檢視區
- 列出每一個題目
    - 包含題目音檔、題目文字(用toggle藏起來，使用者點開才能看到)
- 作答記錄包含音檔、音檔轉成的文字
- 每一題的文字可以按一個按鈕給 AI，讓 AI 進行評分、挑出錯誤、給修改的建議
- 每一題還可以另外獨立重新作答、重新評分
- 保留每次作答的紀錄

### Error Log
- 紀錄挑選出來的錯誤
- 先比照 writing 的錯誤分類


## 評分標準

| Score | Description | Typical Response Features |
| :--- | :--- | :--- |
| **5** | **A fully successful response.**<br>The response fully addresses the question, and it is clear and fluent. | - The response is on topic and well elaborated.<br>- Good conversational speaking pace is maintained with appropriate and natural use of pauses.<br>- Pronunciation is easily intelligible; rhythm and intonation effectively convey meaning.<br>- A range of accurate grammar and vocabulary allows clear expression of precise meanings. |
| **4** | **A generally successful response.**<br>The response addresses the question, and it is reasonably clear. | - The response is on topic and elaborated, but it may lack effective sentence-level connectors.<br>- Good speaking pace is generally maintained, with some pausing that may minimally affect flow.<br>- Intelligibility and meaning are not impeded by pronunciation, rhythm and intonation, although occasional words/phrases may require minor effort to understand.<br>- Grammar and vocabulary are adequate to express general meanings most of the time. |
| **3** | **A partially successful response.**<br>The response addresses the question, but with limited elaboration and/or clarity. | - The response is generally on topic, but elaboration may be relatively limited.<br>- Frequent or lengthy pauses result in a choppy pace; filler words are frequent.<br>- Intelligibility is sometimes affected by inaccuracies in word-level pronunciation or stress/rhythm.<br>- Limited range and accuracy of grammar and vocabulary noticeably restrict the precision and clarity of meanings. |
| **2** | **A mostly unsuccessful response.**<br>The response reflects an attempt to address the question, but it is not supported in a meaningful and/or intelligible way. | - The response is minimally connected to the interviewer’s question, but it is not supported in a meaningful and/or intelligible way.<br>- Intelligibility is limited; the speaker’s intended meaning is often difficult to discern.<br>- The response shows a very limited range of grammar and vocabulary. |
| **1** | **An unsuccessful response.**<br>The response minimally addresses the question, and it may demonstrate very limited control of language. | - The response is on topic and well elaborated.<br>- Good conversational speaking pace is maintained with appropriate and natural use of pauses.<br>- Pronunciation is easily intelligible; rhythm and intonation effectively convey meaning.<br>- A range of accurate grammar and vocabulary allows clear expression of precise meanings. |
| **0** | **Unscorable** | No response OR the response is entirely unintelligible OR there is no English in the response OR the content is entirely unconnected to the prompt (or consists only of phrases such as “I don’t know”). |
