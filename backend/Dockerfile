FROM python:3.13.5-alpine
EXPOSE 8000

WORKDIR /backend

COPY ./requirements.txt /backend/requirements.txt
RUN apk add build-base python3-dev musl-dev linux-headers
RUN pip install -r requirements.txt

COPY . /backend/
CMD [ "fastapi", "run", "main.py", "--host", "0.0.0.0", "--port", "8000" ]
