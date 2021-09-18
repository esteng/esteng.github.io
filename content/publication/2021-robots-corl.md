+++
abstract = "Enabling human operators to interact with robotic agents using natural language would allow non-experts to intuitively instruct these agents. Towards this goal, we propose a novel Transformer-based model which enables a user to guide a robot arm through a 3D multi-step manipulation task with natural language commands. Our system maps images and commands to masks over grasp or place locations, grounding the language directly in perceptual space. In a suite of block rearrangement tasks, we show that these masks can be combined with an existing manipulation framework without re-training, greatly improving learning efficiency. Our masking model is several orders of magnitude more sample efficient than typical Transformer models, operating with hundreds, not millions, of examples. Our modular design allows us to leverage supervised and reinforcement learning, providing an easy interface for experimentation with different architectures. Our model completes block manipulation tasks with synthetic commands 530% more often than a UNet-based baseline, and learns to localize actions correctly while creating a mapping of symbols to perceptual input that supports compositional reasoning. We provide a valuable resource for 3D manipulation instruction following research by porting an existing 3D block dataset with crowdsourced language to a simulated environment. Our method's 25.3% absolute improvement in identifying the correct block on the ported dataset demonstrates its ability to handle syntactic and lexical variation."

authors = ["Elias Stengel-Eskin", "Andrew Hundt", "Zhuohong He", "Aditya Murali", "Nakul Gopalan", "Matthew Gombolay", "Gregory D. Hager"]
date = "2021-08-29"
image_preview = ""
math = true
publication_types = ["1"]
publication = "Conference on Robot Learning"
publication_short = "CoRL  2021"
selected = true
title = "Guiding Multi-Step Rearrangement Tasks with Natural Language Instructions"
url_code = ""
url_dataset = ""
url_pdf = "https://openreview.net/forum?id=-QJ__aPUTN2"
url_project = "" 
url_slides = ""
url_video = ""


# Optional featured image (relative to `static/img/` folder).
[header]
image = ""
caption = ""

+++
