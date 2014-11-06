#Reposit�rio AulaGit

Este reposit�rio foi criado com finalidade did�tica proposta pelo exerc�cio pr�tico do m�dulo de Git do curso **Trilhando o caminho com PHP**. 
Curso ofertado pela escola **[School Of Net](http://www.schoolofnet.com/)**

##**Passo a passo para a cria��o do reposit�rio local e no GitHub.**

01 - Criamos o reposit�rio no GitHub e capturamos a url do reposit�rio

02 - Clonamos o reposit�rio criado no computador, "reposit�rio local"
    $ git clone git@github.com:falcaotech/aulagit.git

03 - Navegando at� a pasta onde ser� criada a pasta do reposit�rio master local
    $ cd d:/sites/aulagit

04 - Criando o arquivo README.md
    $ touch README.md

05 - Editando o arquivo README.md descrevendo todas as etapas de cria��o do reposit�rio no GitHub e local.
    $ vim README.md

06 - Salvando e fechando o arquivo README.md
    $ :wq

07 - Verificando o status
    $ git status

08 - Fazendo o primeiro commit
    $ git add .

09 - Commitando os arquivos do reposit�rio
    $ git commit -m "commit inicial"

10 - Enviando os arquivos para o reposit�rio no GitHub
    $ git push --all