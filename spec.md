# Writing assistant for TOEFL

## TOEFL 題型介紹
### Email
情境設定： 考生會閱讀一封模擬的電子郵件，內容通常是教授、大學行政人員或同事發來的需求、問題或活動公告。任務要求： 考生需要在有限時間內，根據信件內容回覆信件。這通常包含提出請求、表達感謝、詢問細節或解釋個人立場。時間限制： 7 分鐘。時間非常緊湊，要求快速理解並組織內容。字數限制： 無硬性字數限制，但需要結構完整、條理清晰。
#### Example:
You’re enrolled in Professor Lastman’s European History course, which meets on Tuesdays and Thursdays. You were absent last Thursday because of a scheduled medical appointment, and as a result you missed a short in-class quiz that counts toward your participation grade. 

Write an email to your professor. In your email, do the following:

Explain why you were absent and that you understand you missed the quiz.

Ask whether you can make up the quiz or complete an alternate assignment.

Ask if there’s anything else you should review to stay caught up.

### Academic Discussion 
情境設定： 考生會閱讀一封模擬的電子郵件，內容通常是教授、大學行政人員或同事發來的需求、問題或活動公告。任務要求： 考生需要在有限時間內，根據信件內容回覆信件。這通常包含提出請求、表達感謝、詢問細節或解釋個人立場。時間限制： 7 分鐘。時間非常緊湊，要求快速理解並組織內容。字數限制： 無硬性字數限制，但需要結構完整、條理清晰。
#### Example

The professor is teaching a class on science. Write a post responding to the professor’s question.

In your response, you should do the following.

Express and support your opinion.
Make a contribution to the discussion in your own words.
An effective response will contain at least 100 words.

Professor: In our upcoming classes, we will take an in-depth look at autonomous public transit systems. Such systems utilize technology to operate vehicles without human drivers, potentially increasing efficiency and safety while reducing operational costs. However, they also raise questions about employment in the transportation sector and the reliability of technology in public safety. With this in mind, do you oppose or support autonomous public transit systems?

Marco: I’m in favor of autonomous public transit. It’s not only about cutting costs but also improving consistency and safety. Autonomous vehicles can reduce human error, which is often a leading cause of accidents. This could make public transit a safer option for everyone.

 

Sofia: Marco raises valid points about safety and cost, but I’m concerned about the impact on jobs. Implementing these systems could lead to significant job losses for drivers. Also, relying heavily on technology might pose risks if systems fail or are hacked. Therefore, I believe a hybrid approach, where we use some autonomous transport while keeping current means of transportation in place, might be safer and more sustainable.


## Platform
- 區分兩種題型
    - 每種題型下可以放入很多題
    - 可以按下新增鍵去新增題目
    - 題目可以選擇要自己貼上，還是 AI 產生
    - 題目也可以被刪除
- 每一題要有打字的介面、放題目的地方、每次修改後被給的評分、每次修改後的 changes
- 有另一個地方記錄所有的文法/拼字錯誤

## Requirements
- 可以修改上次寫完的文章(修改完要按儲存)，有一個介面可以記錄每次的更動(像是 git difference那種，用紅色綠色標出來)
- 希望錯誤紀錄可以像 ./writing_assistant/tmp/errors 裡面那樣分門別類標示出來，並且參照他的顯示方法

## 評分標準
### Email

| Score | Description | Typical Response Features |
| :--- | :--- | :--- |
| **5** | **A fully successful response.**<br>The response is effective, is clearly expressed, and shows consistent facility in the use of language. | - Elaboration that effectively supports the communicative purpose<br>- Effective syntactic variety and precise, idiomatic word choice<br>- Consistent use of appropriate social conventions (e.g., politeness, register, organization of information and formulation of actions such as requests, refusals, criticisms, etc.)<br>- Almost no lexical or grammatical errors other than those expected from a competent writer writing under timed conditions |
| **4** | **A generally successful response.**<br>The response is mostly effective and easily understood. Language facility is adequate to the task. | - Adequate elaboration to support the communicative purpose<br>- Syntactic variety and appropriate word choice<br>- Mostly appropriate social conventions<br>- Few lexical or grammatical errors |
| **3** | **A partially successful response.**<br>The response generally accomplishes the task. Limitations in language facility may prevent parts of the message from being fully clear and effective. | - Elaboration that partially supports the communicative purpose<br>- A moderate range of syntax and vocabulary<br>- Some noticeable errors in structure, word forms, use of idiomatic language and/or social conventions |
| **2** | **A mostly unsuccessful response.**<br>The response reflects an attempt to address the task, but it is mostly ineffective. The message may be limited or difficult to interpret. | - Limited or irrelevant elaboration<br>- Some connected sentence-level language, with a limited range of syntax and vocabulary<br>- An accumulation of errors in sentence structure and/or language use |
| **1** | **An unsuccessful response.**<br>The response reflects an ineffective attempt to address the task. The message may be limited to the point of being unintelligible. | - Very little elaboration, if any<br>- Telegraphic language with a very limited range of vocabulary<br>- Serious and frequent errors in the use of language<br>- Minimal original language; any coherent language is mostly borrowed from the stimulus |
| **0** | **Unscorable** | The response is blank, rejects the topic, is not in English, is entirely copied from the prompt, is entirely unconnected to the prompt or consists of arbitrary keystrokes. |


### acadamic
| Score | Description | Typical Response Features |
| :--- | :--- | :--- |
| **5** | **A fully successful response.**<br>The response is relevant, and very clearly expressed contribution to the online discussion, and it demonstrates consistent facility in the use of language. | * Relevant and well-elaborated explanations, exemplifications and/or details[cite: 1].<br>* Effective use of a variety of syntactic structures and precise, idiomatic word choice[cite: 1].<br>* Almost no lexical or grammatical errors other than those expected from a competent writer writing under timed conditions (e.g., common typos or common misspellings or substitutions like there/their)[cite: 1]. |
| **4** | **A generally successful response.**<br>The response is a relevant contribution to the online discussion, and facility in the use of language allows the writer’s ideas to be easily understood. | * Relevant and adequately elaborated explanations, exemplifications and/or details[cite: 1].<br>* A variety of syntactic structures and appropriate word choice[cite: 1].<br>* Few lexical or grammatical errors[cite: 1]. |
| **3** | **A partially successful response.**<br>The response is mostly relevant and mostly understandable contribution to the online discussion and there is some facility in the use of language. | * Elaboration in which part of an explanation, example or detail may be missing, unclear or irrelevant[cite: 1].<br>* Some variety in syntactic structures and a range of vocabulary[cite: 1].<br>* Some noticeable lexical and grammatical errors in sentence structure, word form or use of idiomatic language[cite: 1]. |
| **2** | **A mostly unsuccessful response.**<br>The response reflects an attempt to contribute to the online discussion, but limitations in the use of language may make ideas hard to follow. | * Ideas that may be poorly elaborated or only partially relevant[cite: 1].<br>* A limited range of syntactic structures and vocabulary[cite: 1].<br>* An accumulation of errors in sentence structure, word forms or use[cite: 1]. |
| **1** | **An unsuccessful response.**<br>The response reflects an ineffective attempt to contribute to the online discussion, and the limitations in the use of language may prevent the expression of ideas. | * Words and phrases that indicate an attempt to address the task, but with few or no coherent ideas[cite: 1].<br>* Severely limited range of syntactic structures and vocabulary[cite: 1].<br>* Serious and frequent errors in the use of language[cite: 1].<br>* Minimal original language; any coherent language is mostly borrowed from the stimulus[cite: 1]. |
| **0** | **Unscorable** | The response is blank, rejects the topic, is not in English, is entirely copied from the prompt, is entirely unconnected to the prompt or consists of arbitrary keystrokes[cite: 1]. |